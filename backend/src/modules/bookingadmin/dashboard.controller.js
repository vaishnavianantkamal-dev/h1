// Port of App\Http\Controllers\Dashboard\DashBoardController
const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/db');
const validate = require('../../utils/validate');
const { getScopedCityId } = require('../../utils/cityScoped');
const { dayjs } = require('../../utils/time');

const FMT = 'YYYY-MM-DD HH:mm:ss';
const D = 'YYYY-MM-DD';
const DAY_MS = 86400000;

// BookingService::SUBSCRIPTION_TYPES
const SUBSCRIPTION_TYPES = ['Monthly Subscription', 'monthly'];
const subTypes = () => {
  try {
    const { BookingService } = require('../../models');
    return (BookingService && BookingService.SUBSCRIPTION_TYPES) || SUBSCRIPTION_TYPES;
  } catch (e) {
    return SUBSCRIPTION_TYPES;
  }
};

const cache = () => require('../../services/CacheService');
// Cache::remember($key, $ttl, $fn)
const remember = (key, ttl, fn) => {
  const c = cache();
  return typeof c.remember === 'function' ? c.remember(key, ttl, fn) : fn();
};

const q = (sql, replacements = []) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const one = async (sql, rep) => (await q(sql, rep))[0] || {};

// PHP round($x, 1)
const round1 = (x) => {
  const v = Math.round(Math.abs(x) * 10 + 1e-9) / 10;
  return x < 0 ? -v : v;
};
const pct = (cur, prev) => (prev > 0 ? round1(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0));

const startOfWeek = (d) => d.subtract((d.day() + 6) % 7, 'day').startOf('day'); // Carbon: Monday
const endOfWeek = (d) => startOfWeek(d).add(6, 'day').endOf('day');

const DashBoardController = {
  // GET /overview
  async overview(req, res) {
    let filter = req.input('filter');
    const cityId = getScopedCityId(req);

    let fromDate;
    let toDate;

    // custom date range wins over the preset filter
    if (req.filled('from_date') && req.filled('to_date')) {
      fromDate = dayjs(req.input('from_date')).startOf('day');
      toDate = dayjs(req.input('to_date')).endOf('day');
      filter = 'custom';
    } else if (req.filled('from_date') && !req.filled('to_date')) {
      fromDate = dayjs(req.input('from_date')).startOf('day');
      toDate = dayjs(req.input('from_date')).endOf('day');
      filter = 'custom';
    } else {
      switch (filter) {
        case 'day':
          fromDate = dayjs().startOf('day');
          toDate = dayjs().endOf('day');
          break;
        case 'week':
          fromDate = startOfWeek(dayjs());
          toDate = endOfWeek(dayjs());
          break;
        case 'year':
          fromDate = dayjs().startOf('year');
          toDate = dayjs().endOf('year');
          break;
        case 'month':
        default:
          fromDate = dayjs().startOf('month');
          toDate = dayjs().endOf('month');
          filter = 'month';
          break;
      }
    }

    // Carbon::parse() of an unparseable date throws (-> 500)
    if (!fromDate.isValid() || !toDate.isValid()) throw new Error('Could not parse date');

    // Previous period of equal length. Carbon 3's diffInDays() is fractional, so (like PHP) the
    // previous window starts periodDays (fractional) before $fromDate.
    const periodDays = (toDate.valueOf() - fromDate.valueOf()) / DAY_MS + 1;
    const previousFrom = dayjs(fromDate.valueOf() - Math.round(periodDays * DAY_MS));
    const previousTo = fromDate.subtract(1, 'second');

    const cityCond = cityId ? ' AND city_id = ?' : '';
    const cr = cityId ? [cityId] : [];

    // ---- Users ----
    const userScope = cityId
      ? ` AND ((EXISTS (SELECT 1 FROM roles r WHERE r.id = users.role_id AND r.slug = 'customers')
                 AND EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = users.id AND b.city_id = ?))
            OR (users.city_id = ? AND EXISTS (SELECT 1 FROM roles r2 WHERE r2.id = users.role_id AND r2.slug != 'customers')))`
      : '';
    const userRep = cityId ? [cityId, cityId] : [];
    const countUsers = async (a, b) => Number((await one(
      `SELECT COUNT(*) AS c FROM users WHERE users.deleted_at IS NULL AND is_active = 1${userScope} AND created_at BETWEEN ? AND ?`,
      [...userRep, a.format(FMT), b.format(FMT)],
    )).c);
    const currentUsers = await countUsers(fromDate, toDate);
    const previousUsers = await countUsers(previousFrom, previousTo);
    const userPercentage = pct(currentUsers, previousUsers);

    // ---- Bookings by status over booking_date ----
    const countBookings = async (statusSql, statusRep, a, b) => Number((await one(
      `SELECT COUNT(*) AS c FROM bookings WHERE ${statusSql}${cityCond} AND booking_date BETWEEN ? AND ?`,
      [...statusRep, ...cr, a.format(D), b.format(D)],
    )).c);
    const NOT_CANCELLED = ["status NOT IN ('cancelled')", []];
    const COMPLETED = ["status = 'completed'", []];
    const CANCELLED = ["status = 'cancelled'", []];

    const currentBookings = await countBookings(...NOT_CANCELLED, fromDate, toDate);
    const previousBookings = await countBookings(...NOT_CANCELLED, previousFrom, previousTo);
    const bookingPercentage = pct(currentBookings, previousBookings);

    const currentCompleted = await countBookings(...COMPLETED, fromDate, toDate);
    const previousCompleted = await countBookings(...COMPLETED, previousFrom, previousTo);
    const completedPercentage = pct(currentCompleted, previousCompleted);

    const currentCancelled = await countBookings(...CANCELLED, fromDate, toDate);
    const previousCancelled = await countBookings(...CANCELLED, previousFrom, previousTo);
    const cancelledPercentage = pct(currentCancelled, previousCancelled);

    // ---- Revenue (paid completed/confirmed bookings, by created_at) ----
    const sumRevenue = async (a, b) => (await one(
      `SELECT CAST(SUM(amount) AS CHAR) AS s FROM bookings WHERE status IN ('completed','confirmed') AND payment_status = 'paid'${cityCond}
       AND created_at BETWEEN ? AND ?`,
      [...cr, a.format(FMT), b.format(FMT)],
    )).s || 0;
    const currentRevenue = await sumRevenue(fromDate, toDate);
    const previousRevenue = await sumRevenue(previousFrom, previousTo);
    const revenuePercentage = pct(Number(currentRevenue), Number(previousRevenue));

    // ---- Growth (booking growth vs previous period, and how that compares to the period before) ----
    const currentGrowth = previousBookings > 0 ? round1(((currentBookings - previousBookings) / previousBookings) * 100) : 0;

    const prevPrevFrom = dayjs(previousFrom.valueOf() - Math.round(periodDays * DAY_MS));
    const prevPrevTo = previousFrom.subtract(1, 'second');
    const prevPrevBookings = await countBookings(...NOT_CANCELLED, prevPrevFrom, prevPrevTo);

    const previousGrowth = prevPrevBookings > 0 ? round1(((previousBookings - prevPrevBookings) / prevPrevBookings) * 100) : 0;

    const growthPercentage = previousGrowth !== 0
      ? round1(((currentGrowth - previousGrowth) / Math.abs(previousGrowth)) * 100)
      : (currentGrowth > 0 ? 100 : 0);

    // ---- Charts ----
    const revenueChart = await q(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, CAST(SUM(amount) AS CHAR) AS total FROM bookings
       WHERE status IN ('completed','confirmed') AND payment_status = 'paid'${cityCond} AND created_at BETWEEN ? AND ?
       GROUP BY date ORDER BY date`,
      [...cr, fromDate.format(FMT), toDate.format(FMT)],
    );
    const chart = (statusSql) => q(
      `SELECT DATE_FORMAT(booking_date, '%Y-%m-%d') AS date, COUNT(*) AS total FROM bookings
       WHERE ${statusSql}${cityCond} AND booking_date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
      [...cr, fromDate.format(D), toDate.format(D)],
    );
    const bookingChart = await chart("status NOT IN ('cancelled')");
    const completedChart = await chart("status = 'completed'");
    const cancelledChart = await chart("status = 'cancelled'");

    const card = (total, percentage) => ({ total, percentage, trend: percentage >= 0 ? 'up' : 'down' });

    return res.json({
      filter_applied: filter,
      city_id: cityId,
      date_range: { from: fromDate.format(D), to: toDate.format(D) },
      cards: {
        users: card(currentUsers, userPercentage),
        bookings: card(currentBookings, bookingPercentage),
        completed_bookings: card(currentCompleted, completedPercentage),
        cancelled_bookings: card(currentCancelled, cancelledPercentage),
        revenue: card(currentRevenue, revenuePercentage),
        growth: card(currentGrowth, growthPercentage),
      },
      revenue_chart: revenueChart,
      booking_chart: {
        all: bookingChart, // all except cancelled
        completed: completedChart, // completed only
        cancelled: cancelledChart, // cancelled only
      },
    });
  },

  // GET /dashboard/counts
  async counts(req, res) {
    const cityId = getScopedCityId(req);
    const CacheService = cache();
    const cacheKey = CacheService.dashboardCounts(cityId);

    const payload = await remember(cacheKey, CacheService.TTL_5M, async () => {
      const types = subTypes();
      const cityCond = cityId ? ' AND city_id = ?' : '';
      const cr = cityId ? [cityId] : [];

      // Active customers (in a city: those who have booked there)
      const totalCustomers = Number((await one(
        `SELECT COUNT(*) AS c FROM users WHERE users.deleted_at IS NULL AND is_active = 1
         AND EXISTS (SELECT 1 FROM roles r WHERE r.id = users.role_id AND r.slug = 'customers')
         ${cityId ? 'AND EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = users.id AND b.city_id = ?)' : ''}`,
        cr,
      )).c);

      const totalWorkers = Number((await one(
        `SELECT COUNT(*) AS c FROM users WHERE users.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM roles r WHERE r.id = users.role_id AND r.slug IN ('workers'))${cityCond}`,
        cr,
      )).c);

      const totalBookings = Number((await one(
        `SELECT COUNT(*) AS c FROM bookings WHERE status = 'completed'${cityCond}`,
        cr,
      )).c);

      // Instant/one-time services: minutes = service duration (completed bookings only)
      const instantMinutes = Number((await one(
        `SELECT SUM(services.duration_minutes) AS s FROM booking_services
         INNER JOIN services ON booking_services.service_id = services.id
         WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_services.booking_id AND b.status = 'completed'${cityId ? ' AND b.city_id = ?' : ''})
         AND booking_services.booking_type NOT IN (?)
         AND services.duration_minutes IS NOT NULL`,
        [...cr, types],
      )).s || 0);

      // Subscription services: minutes = delivered visits x service duration
      const subscriptionMinutes = Number((await one(
        `SELECT SUM(booking_services.completed_visits * services.duration_minutes) AS s FROM booking_services
         INNER JOIN services ON booking_services.service_id = services.id
         WHERE booking_services.booking_type IN (?) AND booking_services.completed_visits > 0
         ${cityId ? 'AND EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_services.booking_id AND b.city_id = ?)' : ''}
         AND services.duration_minutes IS NOT NULL`,
        [types, ...cr],
      )).s || 0);

      const totalMinutes = instantMinutes + subscriptionMinutes;
      const totalHours = round1(totalMinutes / 60);

      return {
        city_id: cityId,
        total_customers: totalCustomers,
        total_workers: totalWorkers,
        total_bookings: totalBookings,
        total_hours: totalHours,
        total_minutes: totalMinutes,
      };
    });

    return res.json(payload);
  },

  // GET /dashboard/completed-monthly
  async completedMonthly(req, res) {
    const rx = '/^\\d{4}-\\d{2}$/';
    const validated = await validate(req, {
      month: ['nullable', `regex:${rx}`],
      from_month: ['nullable', `regex:${rx}`],
      to_month: ['nullable', `regex:${rx}`],
      year: 'nullable|integer|min:2000|max:2100',
      date_field: 'nullable|in:service_ended_at,booking_date',
      rule: 'nullable|in:tile,strict',
    }, {
      'month.regex': 'month must be in YYYY-MM format, e.g. 2026-04.',
      'from_month.regex': 'from_month must be in YYYY-MM format, e.g. 2026-01.',
      'to_month.regex': 'to_month must be in YYYY-MM format, e.g. 2026-06.',
    });

    const dateField = validated.date_field || 'service_ended_at';
    const rule = validated.rule || 'tile';

    let from;
    let to;
    if (validated.month) {
      from = to = validated.month;
    } else if (validated.from_month || validated.to_month) {
      // one end only -> that single month
      from = validated.from_month || validated.to_month;
      to = validated.to_month || validated.from_month;
    } else {
      const year = validated.year || dayjs().year();
      from = `${year}-01`;
      to = `${year}-12`;
    }

    // tolerate swapped ends
    if (from > to) [from, to] = [to, from];

    const months = DashBoardController._monthsBetween(from, to);

    // cap the range so a typo can't build a huge series
    if (months.length > 24) {
      return res.status(422).json({ success: false, message: 'Range too large — 24 months maximum.' });
    }

    const cityId = getScopedCityId(req);
    const CacheService = cache();
    const cacheKey = CacheService.completedMonthly(cityId, from, to, `${dateField}:${rule}`);

    const payload = await remember(cacheKey, CacheService.TTL_5M, async () => {
      const anchor = DashBoardController._completedAnchorExpr(dateField, rule);
      const types = subTypes();

      const where = [];
      const rep = [];
      if (cityId) { where.push('bookings.city_id = ?'); rep.push(cityId); }
      if (rule === 'strict') {
        where.push("bookings.status = 'completed'");
      } else {
        where.push(`(bookings.status = 'completed' OR EXISTS (SELECT 1 FROM booking_services bs WHERE bs.booking_id = bookings.id
          AND bs.booking_type IN (?) AND bs.completed_visits > 0))`);
        rep.push(types);
      }
      // anchor may carry its own placeholder (tile + service_ended_at), used twice in the SQL
      const anchorRep = anchor.rep;

      const rows = await q(
        `SELECT DATE_FORMAT(${anchor.sql}, '%Y-%m') AS month, COUNT(*) AS completed FROM bookings
         WHERE ${where.join(' AND ')} AND DATE_FORMAT(${anchor.sql}, '%Y-%m') BETWEEN ? AND ?
         GROUP BY month`,
        [...anchorRep, ...rep, ...anchorRep, from, to],
      );
      const counts = {};
      rows.forEach((r) => { counts[r.month] = Number(r.completed); });

      // Zero-fill every month in the range so the chart has no gaps
      const series = months.map((m) => ({
        month: m,
        label: dayjs(`${m}-01`).format('MMM YYYY'),
        completed: Number(counts[m] || 0),
      }));

      return {
        success: true,
        city_id: cityId,
        from_month: from,
        to_month: to,
        date_field: dateField,
        rule,
        total: series.reduce((a, s) => a + s.completed, 0),
        months: series,
      };
    });

    return res.json(payload);
  },

  // The date a counted booking is filed under (see PHP docblock): service_ended_at ->
  // MAX(last_completed_date) of subscription lines -> booking_date. Returns { sql, rep }.
  _completedAnchorExpr(dateField, rule) {
    if (dateField === 'booking_date') return { sql: 'bookings.booking_date', rep: [] };
    if (rule === 'strict') return { sql: 'bookings.service_ended_at', rep: [] };

    return {
      sql: 'COALESCE(bookings.service_ended_at, '
        + '(SELECT MAX(s.last_completed_date) FROM booking_services s'
        + '  WHERE s.booking_id = bookings.id'
        + '    AND s.booking_type IN (?)'
        + '    AND s.completed_visits > 0), '
        + 'bookings.booking_date)',
      rep: [subTypes()],
    };
  },

  // Inclusive list of "YYYY-MM" strings from $from to $to.
  _monthsBetween(from, to) {
    let cursor = dayjs(`${from}-01`).startOf('month');
    const end = dayjs(`${to}-01`).startOf('month');

    const months = [];
    while (!cursor.isAfter(end)) {
      months.push(cursor.format('YYYY-MM'));
      cursor = cursor.add(1, 'month');
      if (months.length > 24) break;
    }
    return months;
  },
};

module.exports = DashBoardController;
