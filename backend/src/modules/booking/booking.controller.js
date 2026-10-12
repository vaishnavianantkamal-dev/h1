// Port of App\Http\Controllers\Api\BookingController
const crypto = require('crypto');
const axios = require('axios');
const config = require('../../config');
const { Booking, BookingService, Service, User, BookingExtension, BookingVisitOverride, sequelize, Op } = require('../../models');
const { QueryTypes } = require('sequelize');
const validate = require('../../utils/validate');
const { abort } = require('../../utils/errors');
const { findOrFail } = require('../../utils/binding');
const { getScopedCityId } = require('../../utils/cityScoped');
const { build: buildPage } = require('../../utils/paginate');
const hash = require('../../utils/hash');
const { dayjs } = require('../../utils/time');
const ExtensionPaymentService = require('../../services/ExtensionPaymentService');
const { attr } = require('../../models/serializer');
const H = require('./booking.helpers');
const exporter = require('./booking.export');
const views = require('./booking.views');

const { q, lit } = H;

// config('services.hobit.payment_link_url')
const PAYMENT_LINK_URL = 'https://hobitadmin.hobit.club/api/booking/send-payment-link';
const SUBSCRIPTION_TYPES = (BookingService && BookingService.SUBSCRIPTION_TYPES) || ['Monthly Subscription', 'monthly'];
const PAYMENT_UNPAID = (Booking && Booking.PAYMENT_UNPAID) || 'unpaid';
const EXT_PENDING = (BookingExtension && BookingExtension.PAYMENT_PENDING) || 'pending';

const round = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round((Number(n) + Number.EPSILON) * f) / f;
};
const today = () => dayjs().format('YYYY-MM-DD');
const toDateStr = (v) => H.carbonParse(v).format('YYYY-MM-DD');
const andWhere = (list) => (list.length ? { [Op.and]: list } : undefined);
const dateOnly = (v) => dayjs(v).format('YYYY-MM-DD');
const randomStr = (n) => crypto.randomBytes(n).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, n).padEnd(n, 'x');

// Eager loads shared by the list endpoints. hasMany loads are `separate` (like Eloquent's extra query).
const listIncludes = (withPlan) => [
  { association: 'service', include: [{ association: 'category' }] },
  { association: 'customer' },
  { association: 'worker' },
  {
    association: 'services',
    separate: true,
    include: [
      { association: 'service' },
      { association: 'subscriptionType' },
      ...(withPlan ? [{ association: 'servicePlan' }] : []),
      { association: 'addon' },
    ],
  },
];

// $request->get('per_page', 20) -> paginate($perPage): falsy -> model default 15; non-numeric -> TypeError (500); < 1 -> SQL error (500)
const perPageOf = (req) => {
  const raw = req.input('per_page', 20);
  if (raw === null || raw === false || raw === 0 || raw === '0' || raw === '') return 15;
  if (!H.isNumeric(raw)) throw new Error('paginate(): Argument must be of type int');
  const n = Math.trunc(Number(raw));
  if (n < 1) throw new Error('SQLSTATE: invalid LIMIT');
  return n;
};
// Paginator::resolveCurrentPage: filter_var(FILTER_VALIDATE_INT) && >= 1, else 1
const pageOf = (req) => {
  const v = req.input('page');
  const s = typeof v === 'number' ? String(v) : v;
  if (typeof s === 'string' && /^[+-]?(0|[1-9]\d*)$/.test(s) && parseInt(s, 10) >= 1) return parseInt(s, 10);
  return 1;
};

// Collection::groupBy
const groupBy = (rows, key) => {
  const m = new Map();
  rows.forEach((r) => {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return m;
};

// Extension service used by instant extend (form + submit)
const findExtensionService = () =>
  Service.findOne({
    where: {
      category_id: config.services.instantCategoryId,
      name: { [Op.like]: '%Extend%' },
      status: 1,
    },
  });

const WHATSAPP_EXPIRED_MSG =
  '❌ *This time slot is no longer available for today.*\n\n' +
  'The selected slot has already been booked or expired.\n\n' +
  '👉 Please choose another time slot or book for tomorrow.\n' +
  '🙏 Thank you!';

// ---------------------------------------------------------------------------------------------
// Bot booking creation (shared by bookingStore and bookingStore__ which differ only in service match)
async function botBookingStore(req, res, matchService) {
  const botPayload = req.all();

  console.log('BOT bookingStore: incoming request', { payload: botPayload });

  req.body = {
    ...(req.body || {}),
    category_id: H.isNumeric(req.input('category_id')) ? Math.trunc(Number(req.input('category_id'))) : null,
    price: H.isNumeric(req.input('price')) ? Number(req.input('price')) : null,
    quantity: H.isNumeric(req.input('quantity')) ? Math.trunc(Number(req.input('quantity'))) : 1,
  };

  const validated = await validate(req, {
    phone: 'required|string',
    customer_name: 'required|string',
    category_id: 'nullable|integer',
    service: 'required|string',
    price: 'nullable|numeric',
    quantity: 'nullable|integer|min:1',
    booking_date: 'required|string',
    time_slot: 'required|string',
    address_details: 'required|string',
    source: 'nullable|string',
    bot_session_id: 'nullable|string',
  });

  const [customer] = await User.findOrCreate({
    where: { phone: validated.phone },
    defaults: {
      name: validated.customer_name,
      password: hash.make(randomStr(10)),
      is_active: true,
    },
  });

  // Resolve Service for BOT flows
  const serviceName = validated.service;

  const and = [{ status: true }];
  if (validated.category_id) and.push({ category_id: validated.category_id });
  and.push({ [Op.or]: matchService(serviceName) });

  const service = await Service.findOne({ where: { [Op.and]: and } });

  if (!service) {
    console.warn('BOT bookingStore: service not found', { service_input: serviceName, category_id: validated.category_id });
    return res.status(404).json({ success: false, message: 'Service not found' });
  }

  const unitPrice = validated.price ?? service.price ?? 0;
  const quantity = validated.quantity ?? 1;

  const amount = unitPrice * quantity;

  let booking;
  try {
    booking = await Booking.create({
      customer_id: customer.id,
      service_id: service.id,

      booking_date: validated.booking_date,
      time_slot: validated.time_slot,
      address: validated.address_details,

      amount,
      quantity,
      status: 'pending',
      payment_status: PAYMENT_UNPAID,

      source: validated.source ?? 'Whatsapp',
      bot_session_id: validated.bot_session_id ?? null,

      customer_name: validated.customer_name,
      customer_phone: validated.phone,
      bot_payload: botPayload,
    });
  } catch (e) {
    console.error('BOT bookingStore: failed to create booking', {
      customer_id: customer?.id ?? null,
      service_id: service?.id ?? null,
      amount,
      exception: e.message,
    });
    return res.status(500).json({ success: false, message: 'Failed to create booking' });
  }

  try {
    await axios.post(PAYMENT_LINK_URL, { booking_id: booking.id, phone: validated.phone }, { timeout: 5000, validateStatus: () => true });
  } catch (e) {
    console.error('BOT bookingStore: payment link trigger failed', { booking_id: booking.id, error: e.message });
  }

  console.log('BOT bookingStore: booking created successfully', {
    booking_id: booking.id,
    customer_id: booking.customer_id,
    service_id: booking.service_id,
    amount,
    category_id: validated.category_id,
    service_name: serviceName,
  });

  return res.status(201).json({
    success: true,
    booking_id: booking.id,
    amount,
    currency: 'INR',
    status: 'pending',
  });
}

const controller = {
  // GET /getbookings  (auth)
  async index(req, res) {
    const cityId = getScopedCityId(req);

    const and = [];
    if (cityId) and.push({ city_id: cityId });

    // Filter by status
    if (req.filled('status')) and.push({ status: req.input('status') });

    // Search by booking ID, customer name, or service name
    if (req.filled('search')) and.push(H.searchCondition(String(req.input('search')).trim()));

    // Filter by date range / single date
    if (req.filled('from_date') && req.filled('to_date')) {
      and.push(H.whereDate('Booking.booking_date', '>=', toDateStr(req.input('from_date'))));
      and.push(H.whereDate('Booking.booking_date', '<=', toDateStr(req.input('to_date'))));
    } else if (req.filled('from_date')) {
      and.push(H.whereDate('Booking.booking_date', '=', toDateStr(req.input('from_date'))));
    } else if (req.filled('to_date')) {
      and.push(H.whereDate('Booking.booking_date', '<=', toDateStr(req.input('to_date'))));
    }

    // Filter by slot time (compares parsed start times; see helpers.applySlotFilters)
    const slotFiltered = H.applySlotFilters(req, and);

    // Filter by subscription type ID
    if (req.filled('subscription_type_id')) {
      and.push(H.EXISTS_SERVICES(`bs.subscription_type_id = ${q(req.input('subscription_type_id'))}`));
    }

    // Filter by subscription type name
    if (req.filled('subscription_type')) {
      and.push(H.EXISTS_SERVICES_SUBTYPE(`st.name LIKE ${q(`%${req.input('subscription_type')}%`)}`));
    }

    // Filter by service category ID
    if (req.filled('category_id')) {
      and.push(H.EXISTS_SERVICE(`s0.category_id = ${q(req.input('category_id'))}`));
    }

    // Filter by booking type
    if (req.filled('booking_type')) {
      and.push(H.EXISTS_SERVICES(`bs.booking_type = ${q(req.input('booking_type'))}`));
    }

    // Rescheduled filter
    // ?rescheduled=1 | today | upcoming | previous|past | YYYY-MM-DD
    if (req.filled('rescheduled')) {
      const mode = req.input('rescheduled');
      const t = q(today());
      if (mode === 'today') and.push(H.EXISTS_OVERRIDES(`DATE(vo.visit_date) = ${t}`));
      else if (mode === 'upcoming') and.push(H.EXISTS_OVERRIDES(`DATE(vo.visit_date) >= ${t}`));
      else if (mode === 'previous' || mode === 'past') and.push(H.EXISTS_OVERRIDES(`DATE(vo.visit_date) < ${t}`));
      else if (/^\d{4}-\d{2}-\d{2}$/.test(String(mode))) and.push(H.EXISTS_OVERRIDES(`DATE(vo.visit_date) = ${q(mode)}`));
      else and.push({ reschedule_count: { [Op.gt]: 0 } });
    }

    // Extended filter
    // ?extended=1 | today | YYYY-MM-DD | paid | pending | failed
    if (req.filled('extended')) {
      const mode = req.input('extended');
      if (mode === 'today') and.push(H.EXISTS_EXTENSIONS(`DATE(be.created_at) = ${q(today())}`));
      else if (['paid', 'pending', 'failed'].includes(mode)) and.push(H.EXISTS_EXTENSIONS(`be.payment_status = ${q(mode)}`));
      else if (/^\d{4}-\d{2}-\d{2}$/.test(String(mode))) and.push(H.EXISTS_EXTENSIONS(`DATE(be.created_at) = ${q(mode)}`));
      else and.push({ extension_count: { [Op.gt]: 0 } });
    }

    // Today filter (22-5-26 add subscription logic)
    if (req.filled('today')) {
      and.push(...H.todayConditions(today()));
    }

    // Stats - base stats query: city + subscription_type_id + category_id filters
    const statsBase = [];
    if (cityId) statsBase.push({ city_id: cityId });
    if (req.filled('subscription_type_id')) {
      statsBase.push(H.EXISTS_SERVICES(`bs.subscription_type_id = ${q(req.input('subscription_type_id'))}`));
    }
    if (req.filled('category_id')) {
      statsBase.push(H.EXISTS_SERVICE(`s0.category_id = ${q(req.input('category_id'))}`));
    }
    const statsCount = (extra = []) => Booking.count({ where: andWhere([...statsBase, ...extra]) });

    const [commissions] = await sequelize.query(
      'SELECT SUM(company_commission) AS total_company_commission, SUM(worker_earning) AS total_worker_earning FROM commissions',
      { type: QueryTypes.SELECT }
    );
    const companyCommission = Number(commissions?.total_company_commission ?? 0);
    const workerEarning = Number(commissions?.total_worker_earning ?? 0);

    // Booking::activeMembership() scope combined with the stats filters
    const activeScope = Booking.scope('activeMembership')._scope || {};
    const activeSubscriptions = await Booking.count({
      where: andWhere([...(activeScope.where ? [activeScope.where] : []), ...statsBase]),
      include: activeScope.include,
      distinct: !!activeScope.include,
    });

    const stats = {
      total_bookings: await statsCount(),
      total_bookings_excluding_cancelled: await statsCount([{ status: { [Op.ne]: 'cancelled' } }]),
      completed_bookings: await statsCount([
        {
          [Op.or]: [
            { status: 'completed' },
            H.EXISTS_SERVICES(`bs.booking_type IN (${SUBSCRIPTION_TYPES.map((t) => q(t)).join(',')}) AND bs.completed_visits > 0`),
          ],
        },
      ]),
      pending_bookings: await statsCount([{ status: 'pending' }]),
      confirmed_bookings: await statsCount([{ status: 'confirmed' }]),
      cancelled_bookings: await statsCount([{ status: 'cancelled' }]),
      inprogress_bookings: await statsCount([{ status: 'inprogress' }]),
      assigned_bookings: await statsCount([{ status: 'assigned' }]),
      paused_bookings: await statsCount([{ status: 'paused' }]),
      // Upcoming reschedules only - matches ?rescheduled=upcoming
      rescheduled_bookings: await statsCount([H.EXISTS_OVERRIDES(`DATE(vo.visit_date) >= ${q(today())}`)]),
      // Every booking ever rescheduled (includes instant bookings)
      total_rescheduled_bookings: await statsCount([{ reschedule_count: { [Op.gt]: 0 } }]),
      // Extends requested today (any payment status) - matches ?extended=today
      extended_bookings: await statsCount([H.EXISTS_EXTENSIONS(`DATE(be.created_at) = ${q(today())}`)]),
      // Every booking that ever had a paid extend applied
      total_extended_bookings: await statsCount([{ extension_count: { [Op.gt]: 0 } }]),
      active_subscriptions: activeSubscriptions,
      total_company_commission: round(companyCommission),
      total_worker_earning: round(workerEarning),
      total_commission: round(companyCommission + workerEarning),
    };

    const perPage = perPageOf(req);
    const page = pageOf(req);
    const where = andWhere(and);
    const total = await Booking.count({ where });
    const bookings = await Booking.findAll({
      where,
      include: listIncludes(true),
      order: slotFiltered ? H.slotOrder() : [['created_at', 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    });
    const meta = buildPage(bookings, total, page, perPage, req);

    // One-day reschedules (monthly subscriptions) for the bookings on this page
    const ids = bookings.map((b) => b.id);
    const pageOverrides = groupBy(
      ids.length ? await BookingVisitOverride.findAll({ where: { booking_id: { [Op.in]: ids } }, order: [['visit_date', 'ASC']] }) : [],
      'booking_id'
    );
    // Extends for the bookings on this page
    const pageExtensions = groupBy(
      ids.length ? await BookingExtension.findAll({ where: { booking_id: { [Op.in]: ids } }, order: [['created_at', 'ASC']] }) : [],
      'booking_id'
    );

    const todayStr = today();

    const data = bookings.map((booking) => {
      const out = H.formatBookingDates(booking);

      const overrides = pageOverrides.get(booking.id) || [];

      const todayOv = overrides.find((o) => dateOnly(o.visit_date) === todayStr);
      const nextOv = overrides.find((o) => dateOnly(o.visit_date) >= todayStr);
      const previousOv = [...overrides].reverse().find((o) => dateOnly(o.visit_date) < todayStr);

      // Additive display fields - status / time_slot stay untouched.
      out.effective_time_slot = todayOv?.time_slot ?? booking.time_slot;
      out.is_rescheduled_today = !(todayOv === undefined || todayOv === null);
      out.next_visit_override = nextOv ? { visit_date: dateOnly(nextOv.visit_date), time_slot: nextOv.time_slot } : null;
      out.previous_visit_override = previousOv ? { visit_date: dateOnly(previousOv.visit_date), time_slot: previousOv.time_slot } : null;

      // Extend info - minutes and amount count paid extends only
      const extensions = pageExtensions.get(booking.id) || [];
      const paid = extensions.filter((e) => e.payment_status === 'paid');
      const lastExt = extensions.length ? extensions[extensions.length - 1] : null;

      out.is_extended_today = extensions.some((e) => dateOnly(e.created_at) === todayStr);
      out.extensions_count = paid.length;
      out.total_extended_minutes = Math.trunc(paid.reduce((s, e) => s + Number(e.duration_minutes || 0), 0));
      out.total_extension_amount = round(paid.reduce((s, e) => s + Number(e.amount || 0), 0));
      out.last_extension = lastExt
        ? {
            id: lastExt.id,
            duration_minutes: Math.trunc(Number(lastExt.duration_minutes)),
            amount: Number(lastExt.amount),
            payment_status: lastExt.payment_status,
            created_at: lastExt.created_at,
            paid_at: lastExt.paid_at,
          }
        : null;

      return out;
    });

    return res.json({
      success: true,
      stats,
      applied_filters: H.arrayFilter(
        req.only('status', 'payment_status', 'search', 'from_date', 'to_date', 'subscription_type_id', 'subscription_type',
          'category_id', 'booking_type', 'today', 'rescheduled', 'extended', 'time_slot', 'slot_from', 'slot_to')
      ),
      total,
      per_page: perPage,
      current_page: page,
      last_page: meta.last_page,
      count: bookings.length,
      data,
    });
  },

  // GET allcustomers/bookings  (auth)
  async customersWithBookings(req, res) {
    const cityId = getScopedCityId(req);

    const cityCond = cityId ? ` AND b.city_id = ${q(cityId)}` : '';
    const roleCond = lit("EXISTS (SELECT 1 FROM roles r WHERE r.id = User.role_id AND r.slug = 'customers')");
    // A customer belongs to a city if they have a booking in that city - NOT by users.city_id.
    const hasBookingCond = lit(`EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = User.id${cityCond})`);

    const and = [roleCond, hasBookingCond];

    // Search by customer name, phone or email
    if (req.filled('search')) {
      const like = q(`%${String(req.input('search')).trim()}%`);
      and.push({
        [Op.or]: [lit(`User.name LIKE ${like}`), lit(`User.phone LIKE ${like}`), lit(`User.email LIKE ${like}`)],
      });
    }

    // Filter by payment status (latest booking's payment status)
    if (req.filled('payment_status') && req.input('payment_status') !== 'all') {
      and.push(
        lit(
          `EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = User.id AND b.payment_status = ${q(req.input('payment_status'))} ` +
            'AND b.id = (SELECT MAX(b2.id) FROM bookings AS b2 WHERE b2.customer_id = b.customer_id))'
        )
      );
    }

    // Filter by booking status
    if (req.filled('status')) {
      and.push(lit(`EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = User.id AND b.status = ${q(req.input('status'))})`));
    }

    // Date filters (d-m-Y)
    const parseDate = (date) => {
      const d = dayjs(String(date), 'DD-MM-YYYY', true);
      return d.isValid() ? d.format('YYYY-MM-DD') : null;
    };
    const existsB = (cond) => lit(`EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = User.id AND ${cond})`);
    if (req.filled('from_date') && req.filled('to_date')) {
      const from = parseDate(req.input('from_date'));
      const to = parseDate(req.input('to_date'));
      if (from && to) and.push(existsB(`DATE(b.booking_date) >= ${q(from)} AND DATE(b.booking_date) <= ${q(to)}`));
    } else if (req.filled('from_date')) {
      const from = parseDate(req.input('from_date'));
      if (from) and.push(existsB(`DATE(b.booking_date) = ${q(from)}`));
    } else if (req.filled('to_date')) {
      const to = parseDate(req.input('to_date'));
      if (to) and.push(existsB(`DATE(b.booking_date) <= ${q(to)}`));
    }

    // Stats (scoped to the same city as the customer rows above)
    const totalCustomers = await User.count({ where: { [Op.and]: [roleCond, hasBookingCond] } });

    const cityWhere = cityId ? { city_id: cityId } : {};
    const activeBookings = await Booking.count({ where: { status: { [Op.in]: ['confirmed', 'inprogress', 'assigned'] }, ...cityWhere } });
    const pendingPayments = await Booking.count({ where: { payment_status: 'unpaid', status: { [Op.notIn]: ['cancelled'] }, ...cityWhere } });

    const [avgRow] = await sequelize.query(
      'SELECT AVG(br.rating) AS avg_rating FROM booking_ratings br' +
        (cityId ? ` WHERE EXISTS (SELECT 1 FROM bookings bk WHERE bk.id = br.booking_id AND bk.city_id = ${q(cityId)})` : ''),
      { type: QueryTypes.SELECT }
    );
    const avgRating = avgRow && avgRow.avg_rating !== null ? Number(avgRow.avg_rating) : null;

    const stats = {
      total_customers: totalCustomers,
      active_bookings: activeBookings,
      pending_payments: pendingPayments,
      avg_rating: avgRating ? round(avgRating, 1) : 0,
    };

    const perPage = perPageOf(req);
    const page = pageOf(req);
    const where = { [Op.and]: and };
    const total = await User.count({ where });
    const customers = await User.findAll({
      where,
      include: [
        {
          association: 'customerBookings',
          separate: true,
          where: cityId ? { city_id: cityId } : undefined,
          include: [
            {
              association: 'services',
              separate: true,
              include: [{ association: 'service' }, { association: 'subscriptionType' }, { association: 'addon' }],
            },
            { association: 'worker' },
          ],
        },
        { association: 'ratings', separate: true },
      ],
      order: [['created_at', 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    });
    const meta = buildPage(customers, total, page, perPage, req);

    const fmt = (d) => (d ? H.carbonParse(d).format('DD-MM-YYYY') : null);
    const data = customers.map((customer) => {
      const bookings = customer.customerBookings || [];
      const ratings = customer.ratings || [];
      const cnt = (key, val) => bookings.filter((b) => b[key] == val).length; // eslint-disable-line eqeqeq
      const ratingAvg = ratings.length ? ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length : null;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        created_at: customer.created_at ? dayjs(customer.created_at).format('DD-MM-YYYY') : null,

        avg_rating: ratings.length > 0 ? round(ratingAvg, 1) : null,
        total_ratings: ratings.length,

        total_bookings: bookings.length,
        completed_bookings: cnt('status', 'completed'),
        pending_bookings: cnt('status', 'pending'),
        confirmed_bookings: cnt('status', 'confirmed'),
        cancelled_bookings: cnt('status', 'cancelled'),
        inprogress_bookings: cnt('status', 'inprogress'),
        assigned_bookings: cnt('status', 'assigned'),
        paid_bookings: cnt('payment_status', 'paid'),
        unpaid_bookings: cnt('payment_status', 'unpaid'),

        bookings: [...bookings]
          .sort((a, b) => b.id - a.id)
          .map((booking) => ({
            id: booking.id,
            booking_date: fmt(booking.booking_date),
            status: booking.status,
            payment_status: booking.payment_status,
            address: booking.address,
            total_amount: booking.total_amount ?? null,
            time_slot: booking.time_slot,
            amount: attr('Booking', 'amount', booking.amount),
            worker: booking.worker
              ? { id: booking.worker.id, name: booking.worker.name, phone: booking.worker.phone }
              : null,
            services: (booking.services || []).map((service) => ({
              id: service.id,
              service_name: service.service?.name ?? null,
              subscription_type: service.subscriptionType?.name ?? null,
              addon: service.addon?.name ?? null,
              booking_type: service.booking_type,
              start_date: fmt(service.start_date),
              end_date: fmt(service.end_date),
            })),
          })),
      };
    });

    return res.json({
      success: true,
      stats,
      applied_filters: H.arrayFilter(req.only('search', 'status', 'payment_status', 'from_date', 'to_date')),
      total,
      per_page: perPage,
      current_page: page,
      last_page: meta.last_page,
      count: customers.length,
      data,
    });
  },

  // GET /bot/services
  async services(req, res) {
    const rows = await Service.findAll({ where: { status: true } });
    const services = rows.map((service) => ({
      id: service.id,
      category_id: service.category_id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: H.calculatePrice(service),
    }));

    return res.json({ success: true, data: services });
  },

  // POST /bot/bookings  - Create Booking (BOT -> CRM)
  async bookingStore(req, res) {
    return botBookingStore(req, res, (serviceName) => {
      const conds = [{ name: serviceName }, { service_group: serviceName }, { size_value: serviceName }];

      const normalized = (serviceName.replace(/\s*BHK.*/i, '') || '').trim(); // strip " BHK..." suffix
      if (normalized && normalized !== serviceName) conds.push({ size_value: normalized });

      const m = serviceName.match(/\(([^)]+)\)/);
      if (m) {
        const inner = m[1].trim();
        if (inner) conds.push({ size_value: { [Op.like]: `%${inner}%` } });
      }
      return conds;
    });
  },

  // (unrouted legacy variant kept from PHP)
  async bookingStore__(req, res) {
    return botBookingStore(req, res, (serviceName) => {
      const conds = [{ name: serviceName }, { service_group: serviceName }, { size_value: serviceName }];

      const normalized = serviceName.replace(/BHK/gi, '').trim();
      if (normalized !== serviceName) conds.push({ size_value: normalized });
      return conds;
    });
  },

  // POST /whatsapp/send
  async send(req, res) {
    await validate(req, { phone: 'required|string', message: 'required|string' });

    const phoneNumberId = config.whatsapp.phoneNumberId;
    const accessToken = config.whatsapp.accessToken;

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: req.input('phone'),
        type: 'text',
        text: { body: req.input('message') },
      },
      { headers: { Authorization: `Bearer ${accessToken}` }, validateStatus: () => true }
    );
    const successful = response.status >= 200 && response.status < 300;

    return res.status(successful ? 200 : 400).json({
      success: successful,
      meta_response: response.data ?? null,
    });
  },

  // POST /bot/validate-slot
  async validateSlot(req, res) {
    await validate(req, { booking_date: 'required|string', time_slot: 'required|string', phone: 'required|string' });

    const now = dayjs();

    try {
      if (req.input('type') == 'instant') { // eslint-disable-line eqeqeq
        const inputTime = H.normalizeTime(req.input('time_slot'));

        const startTime = dayjs().startOf('day').hour(9); // 09:00 AM
        const endTime = dayjs().startOf('day').hour(18); // 06:00 PM

        const isValid = !inputTime.isBefore(startTime) && !inputTime.isAfter(endTime);
        if (isValid === true) {
          if (now.isBefore(inputTime)) return res.json({ stop_flow: 'true' });
          return res.json({ stop_flow: 0 });
        }
        await H.sendWhatsApp(req.input('phone'), WHATSAPP_EXPIRED_MSG);
        return res.json({ stop_flow: 0 });
      }

      const raw = String(req.input('booking_date')).trim().toLowerCase();

      // TOMORROW -> stop flow (no validation)
      if (raw === 'tomorrow') return res.json({ stop_flow: 'true' });

      // Resolve booking date
      const bookingDate = raw === 'today' ? dayjs().startOf('day') : H.carbonParse(req.input('booking_date'));

      // Parse time slot (09:00 AM - 12:00 PM)
      const m = String(req.input('time_slot')).match(/^\s*(.*?)\s*-\s*(.*?)\s*$/);
      if (!m) return res.json({ stop_flow: 'true' });

      H.parseDateTime(bookingDate.format('YYYY-MM-DD'), m[1].trim()); // slotStart (parsed for validity like PHP)
      const slotEnd = H.parseDateTime(bookingDate.format('YYYY-MM-DD'), m[2].trim());

      if (bookingDate.isSame(now, 'day')) {
        if (now.isBefore(slotEnd)) return res.json({ stop_flow: 'true' });

        await H.sendWhatsApp(req.input('phone'), WHATSAPP_EXPIRED_MSG);
        return res.json({ stop_flow: 0 });
      }
      if (now.isBefore(slotEnd)) return res.json({ stop_flow: 'true' });
      return res.json({ stop_flow: 0 });
    } catch (e) {
      // Safety net
      return res.json({ stop_flow: 'true' });
    }
  },

  // POST /bot/validateslotinstant
  async validateSlotInstant(req, res) {
    await validate(req, { time_slot: 'required|string', phone: 'required|string' });

    try {
      const now = dayjs();
      const todayD = dayjs().startOf('day');

      // Normalise spacing + case
      const slot = String(req.input('time_slot')).trim().replace(/\s+/g, ' ').toUpperCase();

      // Expected format: "10:00 AM - 12:00 PM"
      if (!/^\d{1,2}:\d{2}\s(AM|PM)\s-\s\d{1,2}:\d{2}\s(AM|PM)$/.test(slot)) {
        return res.json({ stop_flow: 0 }); // invalid
      }

      // Extract slot end time
      const endTime = slot.split('-')[1].trim();

      const slotEnd = H.parseDateTime(todayD.format('YYYY-MM-DD'), endTime);

      // Slot expired?
      if (!now.isBefore(slotEnd)) return res.json({ stop_flow: 0 });

      // Slot still valid
      return res.json({ stop_flow: 'true' });
    } catch (e) {
      return res.json({ stop_flow: 0 });
    }
  },

  // POST /bot/booking/slots - Available Slots
  async slots(req, res) {
    await validate(req, { service_id: 'required|exists:services,id', booking_date: 'required|date' });

    await findOrFail(Service, req.input('service_id'));

    const allSlots = [
      '09:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '12:00 AM - 01:00 PM',
      '01:00 PM - 02:00 PM',
      '02:00 PM - 03:00 PM',
      '03:00 PM - 04:00 PM',
    ];

    const rows = await Booking.findAll({
      where: { booking_date: req.input('booking_date'), status: { [Op.in]: ['pending', 'confirmed'] } },
      attributes: ['time_slot'],
    });
    const bookedSlots = rows.map((r) => r.time_slot);

    return res.json({ success: true, slots: allSlots.filter((s) => !bookedSlots.includes(s)) });
  },

  // Create Booking (WhatsApp / CRM) - not routed in routes/api.php, kept for parity
  async store(req, res) {
    await validate(req, {
      phone: 'required|string',
      service_id: 'required|exists:services,id',
      booking_date: 'required|date',
      time_slot: 'required|string',
      address: 'required|string',
      source: 'nullable|string',
    });

    const [customer] = await User.findOrCreate({
      where: { phone: req.input('phone') },
      defaults: { name: 'WhatsApp Customer', password: hash.make(randomStr(10)), is_active: true },
    });

    const slotTaken = await Booking.findOne({
      where: { booking_date: req.input('booking_date'), time_slot: req.input('time_slot'), status: { [Op.in]: ['pending', 'confirmed'] } },
      attributes: ['id'],
    });

    if (slotTaken) {
      return res.status(409).json({ success: false, message: 'Slot already booked' });
    }

    const service = await Service.findOne({ where: { status: true, id: req.input('service_id') } });
    if (!service) abort(404, `No query results for model [App\\Models\\Service] ${req.input('service_id')}`);

    const amount = H.calculatePrice(service);

    const booking = await Booking.create({
      customer_id: customer.id,
      service_id: service.id,
      booking_date: req.input('booking_date'),
      time_slot: req.input('time_slot'),
      address: req.input('address'),
      amount,
      status: 'pending',
      payment_status: 'unpaid',
      source: req.input('source') ?? 'whatsapp',
    });

    return res.json({ success: true, booking_id: booking.id, amount, currency: 'INR', status: 'pending' });
  },

  // GET /bot/bookings/:id - Booking Details (CRM)
  async show(req, res) {
    const booking = await findOrFail(Booking, req.params.id, {
      include: [{ association: 'service', include: [{ association: 'category' }] }],
    });

    const j = booking.toJSON();
    return res.json({
      id: j.id,
      customer_id: j.customer_id,
      worker_id: j.worker_id,
      assigned_by: j.assigned_by,
      service_id: j.service_id,
      service: booking.service.name,
      category: booking.service.category?.name ?? null,
      amount: j.amount,
      booking_date: j.booking_date,
      time_slot: j.time_slot,
      status: j.status,
      payment_status: j.payment_status,
      address: j.address,
    });
  },

  // POST /instant-bookings/:booking/extend
  async extendInstant(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);

    if (booking.status !== 'inprogress') abort(403);

    // Find extension service
    const extensionService = await findExtensionService();

    if (!extensionService) abort(500, 'Extension service not configured');

    const t = await sequelize.transaction();
    let payment;
    try {
      // Create extension
      const extension = await BookingExtension.create(
        {
          booking_id: booking.id,
          duration_minutes: extensionService.duration_minutes,
          amount: extensionService.price,
          payment_status: EXT_PENDING,
        },
        { transaction: t }
      );

      // Create Razorpay payment link
      payment = await ExtensionPaymentService.createLink(extension.id, Number(extension.amount), booking.customer_phone);

      await extension.update(
        {
          razorpay_link_id: payment.id,
          razorpay_payment_url: payment.short_url,
          payment_attempted_at: new Date(),
        },
        { transaction: t }
      );

      await t.commit();
    } catch (e) {
      await t.rollback().catch(() => {});
      abort(500);
    }

    return res.redirect(payment.short_url);
  },

  // GET /instant-bookings/:booking/extend  (HTML page)
  async showExtendForm(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);

    if (booking.status !== 'inprogress') abort(403);

    const extensionService = await findExtensionService();

    if (!extensionService) abort(500, 'Extension service not configured');

    return res.type('html').send(views.extendForm(booking, extensionService, `${req.protocol}://${req.get('host')}`));
  },

  // GET /bot/time_check
  async time_check(req, res) {
    await validate(req, { time_slot: 'required|string', phone: 'required|string' });

    try {
      const now = dayjs();
      const inputTime = H.normalizeTime(req.input('time_slot'));

      const startTime = dayjs().startOf('day').hour(9); // 09:00 AM
      const endTime = dayjs().startOf('day').hour(18); // 06:00 PM

      const isValid = !inputTime.isBefore(startTime) && !inputTime.isAfter(endTime);
      if (isValid === true) {
        if (now.isBefore(inputTime)) return res.json({ flow: 'true' });
        return res.json({ flow: 0 });
      }
      await H.sendWhatsApp(req.input('phone'), WHATSAPP_EXPIRED_MSG);
      return res.json({ flow: 0 });
    } catch (e) {
      return res.status(422).json({ error: 'Invalid time format' });
    }
  },

  // GET /instant-bookings/:booking/extensions
  async getExtensions(req, res) {
    const booking = await findOrFail(Booking, req.params.booking, {
      include: [
        { association: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
        { association: 'worker', attributes: ['id', 'name', 'phone', 'email'] },
        { association: 'service', attributes: ['id', 'name', 'duration_minutes', 'price'] },
        { association: 'extensions' },
      ],
    });

    const j = booking.toJSON();
    return res.json({
      success: true,
      booking: {
        id: j.id,
        status: j.status,
        amount: j.amount,
        payment_status: j.payment_status,
        service_start: j.service_started_at,
        service_end: j.service_end_at,
        extension_count: j.extension_count,

        customer: booking.customer,
        worker: booking.worker,
        service: booking.service,

        extensions: (booking.extensions || []).map((e) => {
          const ext = e.toJSON();
          return {
            id: ext.id,
            duration_minutes: ext.duration_minutes,
            amount: ext.amount,
            payment_status: ext.payment_status,
            payment_link: ext.razorpay_payment_url,
            paid_at: ext.paid_at,
            created_at: ext.created_at,
          };
        }),
      },
    });
  },

  // GET /bookings/filter  (auth)
  async filterBookings(req, res) {
    const cityId = getScopedCityId(req);

    const and = [];
    if (cityId) and.push({ city_id: cityId });

    if (req.filled('status')) and.push({ status: req.input('status') });
    if (req.filled('payment_status')) and.push({ payment_status: req.input('payment_status') });
    if (req.filled('source') && !req.filled('booking_type')) and.push({ source: req.input('source') });

    if (req.filled('date')) and.push(H.whereDate('Booking.booking_date', '=', req.input('date')));
    if (req.filled('from_date')) and.push(H.whereDate('Booking.booking_date', '>=', req.input('from_date')));
    if (req.filled('to_date')) and.push(H.whereDate('Booking.booking_date', '<=', req.input('to_date')));

    if (req.filled('booking_type')) and.push(H.EXISTS_SERVICES(`bs.booking_type = ${q(req.input('booking_type'))}`));
    if (req.filled('subscription_type_id')) {
      and.push(H.EXISTS_SERVICES(`bs.subscription_type_id = ${q(req.input('subscription_type_id'))}`));
    }
    if (req.filled('subscription_type')) {
      and.push(H.EXISTS_SERVICES_SUBTYPE(`st.name LIKE ${q(`%${req.input('subscription_type')}%`)}`));
    }
    if (req.filled('subscription_id')) {
      and.push(H.EXISTS_SERVICE(`s0.subscription_id = ${q(req.input('subscription_id'))}`));
    }

    const perPage = perPageOf(req);
    const page = pageOf(req);
    const where = andWhere(and);
    const total = await Booking.count({ where });
    const bookings = await Booking.findAll({
      where,
      include: listIncludes(false),
      order: [['created_at', 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    });
    const meta = buildPage(bookings, total, page, perPage, req);

    return res.json({
      success: true,
      applied_filters: H.arrayFilter(
        req.only('status', 'payment_status', 'source', 'date', 'from_date', 'to_date', 'booking_type', 'subscription_type_id',
          'subscription_type', 'subscription_id')
      ),
      total,
      per_page: perPage,
      current_page: page,
      last_page: meta.last_page,
      data: bookings.map((b) => H.formatBookingDates(b)),
    });
  },

  // GET bookings/export  (auth)  ?format=csv|excel|pdf
  async export(req, res) {
    await validate(req, {
      from_date: 'nullable|date',
      to_date: [
        'nullable',
        'date',
        (value, data) =>
          data.from_date && dayjs(value).isBefore(dayjs(data.from_date), 'day')
            ? 'The to date field must be a date after or equal to from date.'
            : true,
      ],
      date: 'nullable|date',
      status: 'nullable|string',
      payment_status: 'nullable|in:paid,unpaid,pending,failed',
      format: 'nullable|in:csv,excel,pdf',
      subscription_type_id: 'nullable|integer|exists:subscription_type,id',
      subscription_type: 'nullable|string',
      booking_type: 'nullable|string',
      search: 'nullable|string',
      today: 'nullable|boolean',
      category_id: 'nullable|integer|exists:service_categories,id',
      time_slot: 'nullable|string',
      slot_from: 'nullable|string',
      slot_to: 'nullable|string',
    });

    const cityId = getScopedCityId(req);

    const and = [];
    if (cityId) and.push({ city_id: cityId });

    // Status filter
    if (req.filled('status')) and.push({ status: req.input('status') });

    // Payment status filter
    if (req.filled('payment_status')) and.push({ payment_status: req.input('payment_status') });

    // Search filter
    if (req.filled('search')) and.push(H.searchCondition(String(req.input('search')).trim()));

    // Subscription type ID filter
    if (req.filled('subscription_type_id')) {
      and.push(H.EXISTS_SERVICES(`bs.subscription_type_id = ${q(req.input('subscription_type_id'))}`));
    }

    // Subscription type name filter
    if (req.filled('subscription_type')) {
      and.push(H.EXISTS_SERVICES_SUBTYPE(`st.name LIKE ${q(`%${req.input('subscription_type')}%`)}`));
    }

    // Booking type filter
    if (req.filled('booking_type')) and.push(H.EXISTS_SERVICES(`bs.booking_type = ${q(req.input('booking_type'))}`));

    // Category filter (booking's own service or any of its line-item services)
    if (req.filled('category_id')) {
      const cid = q(req.input('category_id'));
      and.push({
        [Op.or]: [H.EXISTS_SERVICE(`s0.category_id = ${cid}`), H.EXISTS_SERVICES_SERVICE(`s.category_id = ${cid}`)],
      });
    }

    // Date filters (today > date > range)
    if (req.boolean('today')) {
      and.push(...H.todayConditions(today()));
    } else if (req.filled('date')) {
      and.push(H.whereDate('Booking.booking_date', '=', toDateStr(req.input('date'))));
    } else if (req.filled('from_date') && req.filled('to_date')) {
      and.push(H.whereDate('Booking.booking_date', '>=', toDateStr(req.input('from_date'))));
      and.push(H.whereDate('Booking.booking_date', '<=', toDateStr(req.input('to_date'))));
    } else if (req.filled('from_date')) {
      and.push(H.whereDate('Booking.booking_date', '=', toDateStr(req.input('from_date'))));
    } else if (req.filled('to_date')) {
      and.push(H.whereDate('Booking.booking_date', '<=', toDateStr(req.input('to_date'))));
    }

    // Slot time filters (same rules as index())
    const slotFiltered = H.applySlotFilters(req, and);

    const bookings = await Booking.findAll({
      where: andWhere(and),
      include: listIncludes(false),
      order: slotFiltered ? H.slotOrder() : [['created_at', 'DESC']],
    });

    if (!bookings.length) {
      return res.status(404).json({ success: false, message: 'No bookings found for the selected filters.' });
    }

    const format = req.input('format', 'csv');

    switch (format) {
      case 'excel': return exporter.exportExcel(res, bookings);
      case 'pdf': return exporter.exportPdf(res, bookings);
      default: return exporter.exportCsv(res, bookings);
    }
  },
};

module.exports = controller;
