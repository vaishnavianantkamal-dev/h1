// Port of App\Http\Controllers\Admin\WorkerController (routed methods only:
// index, unassigned_worker, store, show, updateStatus, destroy, instantWorker + helpers).
// Unrouted legacy methods (instantWorker_21_03_2026, instantWorker_old, index1) are not ported.
const { Op, QueryTypes, literal } = require('sequelize');
const {
  User, Role, Worker, WorkerAvailability, BookingRating, Booking, ServiceCategory, Service,
  City, Zone, ServiceableArea, sequelize,
} = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const { findOrFail } = require('../../utils/binding');
const { getScopedCityId } = require('../../utils/cityScoped');
const { assetUrl } = require('../../utils/storage');
const { dayjs } = require('../../utils/time');

const esc = (v) => sequelize.escape(v);
const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;
// whereJsonContains(col, scalar)
const jsonContains = (column, value) => literal(`JSON_CONTAINS(${column}, ${esc(JSON.stringify(value))})`);
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  return [];
};

function normalizeIds(value) {
  if (!value || (Array.isArray(value) && !value.length)) return [];
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (e) { value = null; }
  }
  if (Array.isArray(value) && Array.isArray(value[0])) value = value[0];
  if (!Array.isArray(value)) return [];
  return value.map((v) => parseInt(v, 10) || 0).filter(Boolean);
}

// Port of parseTimeSlot(): returns ['H:i', 'H:i'] or throws
function parseTimeSlot(timeSlot) {
  timeSlot = String(timeSlot).replace(/_/g, ' ').trim().replace(/–/g, '-');
  const pad = (n) => String(n).padStart(2, '0');
  const to24 = (str) => {
    const m = String(str).trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (!m) throw new Error('Invalid time slot format');
    let h = parseInt(m[1], 10);
    if (h < 1 || h > 12 || parseInt(m[2], 10) > 59) throw new Error('Invalid time slot format');
    if (m[3] === 'AM') h = h === 12 ? 0 : h; else h = h === 12 ? 12 : h + 12;
    return [h, parseInt(m[2], 10)];
  };

  if (!timeSlot.includes('-')) {
    let h; let mi;
    const m = timeSlot.match(/^(\d{1,2}):(\d{2})$/);
    if (m && parseInt(m[1], 10) <= 23 && parseInt(m[2], 10) <= 59) {
      h = parseInt(m[1], 10); mi = parseInt(m[2], 10);
    } else {
      [h, mi] = to24(timeSlot);
    }
    return [`${pad(h)}:${pad(mi)}`, `${pad((h + 1) % 24)}:${pad(mi)}`];
  }

  const idx = timeSlot.indexOf('-');
  const [sh, sm] = to24(timeSlot.slice(0, idx).trim());
  const [eh, em] = to24(timeSlot.slice(idx + 1).trim());
  return [`${pad(sh)}:${pad(sm)}`, `${pad(eh)}:${pad(em)}`];
}

// Carbon::parse($str)->toDateString() for the common PHP strtotime formats; null when PHP would throw
function carbonParseDate(str) {
  str = String(str).trim();
  const ok = (y, m, d) => {
    const dt = dayjs(new Date(y, m - 1, d));
    return m >= 1 && m <= 12 && d >= 1 && d <= 31 && dt.isValid() ? dt.format('YYYY-MM-DD') : null;
  };
  let m;
  if ((m = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T].*)?$/))) return ok(+m[1], +m[2], +m[3]);
  if ((m = str.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{4})(?:[ T].*)?$/))) return ok(+m[3], +m[2], +m[1]);
  if ((m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T].*)?$/))) return ok(+m[3], +m[1], +m[2]);
  if ((m = str.match(/^(\d{4})(\d{2})(\d{2})$/))) return ok(+m[1], +m[2], +m[3]);
  const lower = str.toLowerCase();
  if (lower === 'today' || lower === 'now') return dayjs().format('YYYY-MM-DD');
  if (lower === 'tomorrow') return dayjs().add(1, 'day').format('YYYY-MM-DD');
  if (lower === 'yesterday') return dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  if (/[a-z]{3}/i.test(str) && !/^\d+$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d) && /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(str)) return dayjs(d).format('YYYY-MM-DD');
  }
  return null;
}

const bookingDateStr = (d) => (d instanceof Date || (d && typeof d === 'object') ? dayjs(d).format('YYYY-MM-DD') : String(d).slice(0, 10));

module.exports = {
  async index(req, res) {
    const authUser = req.user;
    const workerRole = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
    const workerRoleId = workerRole ? workerRole.id : null;

    const and = [{ role_id: workerRoleId }];
    const statsAnd = [{ role_id: workerRoleId }];

    // ROLE BASED FILTERING
    if (authUser.role.slug === 'contractors') {
      and.push({ added_by: authUser.id });
      statsAnd.push({ added_by: authUser.id });
    }

    // CATEGORY FILTER
    if (req.filled('category_id')) and.push(jsonContains('`User`.`category_ids`', parseInt(req.input('category_id'), 10) || 0));
    // SERVICE FILTER
    if (req.filled('service_id')) and.push(jsonContains('`User`.`service_ids`', parseInt(req.input('service_id'), 10) || 0));

    // AVAILABILITY DATE FILTER
    if (req.filled('booking_date')) {
      and.push(literal(`EXISTS (SELECT 1 FROM worker_availabilities wa WHERE wa.worker_id = \`User\`.\`id\` AND wa.status = 1 AND JSON_CONTAINS(wa.available_dates, ${esc(JSON.stringify(req.input('booking_date')))}))`));
    }

    // CITY FILTER: city-admin / co-ordinators -> auto-scoped; super-admin -> optional ?city_id=
    const cityId = getScopedCityId(req);
    if (cityId) {
      and.push({ city_id: cityId });
      statsAnd.push({ city_id: cityId });
    }

    // SEARCH FILTER
    if (req.filled('search')) {
      const s = `%${req.input('search')}%`;
      and.push({ [Op.or]: [{ name: { [Op.like]: s } }, { phone: { [Op.like]: s } }, { email: { [Op.like]: s } }, { public_id: { [Op.like]: s } }] });
    }

    // STATS (role-based only, no filters)
    const allWorkers = await User.findAll({
      where: { [Op.and]: statsAnd },
      include: [{ model: Worker, as: 'worker', required: false }],
    });
    const stats = {
      total_workers: allWorkers.length,
      available: allWorkers.filter((u) => u.is_active).length,
      unavailable: allWorkers.filter((u) => !u.is_active).length,
      approved_kyc: allWorkers.filter((u) => u.worker && u.worker.kyc_status === 'approved').length,
      rejected_kyc: allWorkers.filter((u) => u.worker && u.worker.kyc_status === 'rejected').length,
      pending_kyc: allWorkers.filter((u) => u.worker && u.worker.kyc_status === 'pending').length,
    };

    // PAGINATE
    const perPage = 20;
    const page = Math.max(parseInt(req.query.page ?? 1, 10) || 1, 1);
    const include = [
      { model: Worker, as: 'worker', required: false },
      { model: City, as: 'city', attributes: ['id', 'name'], required: false },
      { model: Zone, as: 'zone', attributes: ['id', 'name'], required: false },
      { model: ServiceableArea, as: 'area', attributes: ['id', 'name'], required: false },
      { model: User, as: 'addedBy', attributes: ['id', 'name', 'public_id'], required: false },
      {
        model: User, as: 'referredBy', required: false,
        attributes: ['id', 'name', 'firm', 'phone', 'referral_code', 'role_id'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'slug'], required: false }],
      },
    ];
    const total = await User.count({ where: { [Op.and]: and } });
    const users = await User.findAll({
      where: { [Op.and]: and }, include, order: [['created_at', 'DESC']], limit: perPage, offset: (page - 1) * perPage,
    });

    // hasMany relations loaded separately (keeps LIMIT/OFFSET exact)
    const ids = users.map((u) => u.id);
    const ratingsByUser = {};
    const availByUser = {};
    if (ids.length) {
      (await BookingRating.findAll({ where: { worker_id: ids } })).forEach((r) => { (ratingsByUser[r.worker_id] ||= []).push(r); });
      (await WorkerAvailability.findAll({ where: { worker_id: ids } })).forEach((a) => { (availByUser[a.worker_id] ||= []).push(a); });
    }

    // TRANSFORM
    const data = [];
    for (const userModel of users) {
      const user = userModel.toJSON(); // Eloquent-shaped attributes (casts / raw PDO values)
      const worker = user.worker;

      // Categories & Services
      const categoryIds = normalizeIds(user.category_ids);
      const serviceIds = normalizeIds(user.service_ids);
      const categories = !categoryIds.length ? [] : await ServiceCategory.findAll({ where: { id: categoryIds }, attributes: ['id', 'name'] });
      const services = !serviceIds.length ? [] : await Service.findAll({ where: { id: serviceIds }, attributes: ['id', 'name'] });

      // Ratings
      const ratings = ratingsByUser[user.id] || [];
      const ratingsAvg = ratings.length ? round1(ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length) : 0;

      // KYC Documents
      const documents = [];
      if (worker && Array.isArray(worker.id_type)) {
        worker.id_type.forEach((type, index) => {
          documents.push({
            type,
            number: (worker.id_number || [])[index] ?? null,
            front_url: (worker.id_front_path || [])[index] != null ? assetUrl('public/storage/' + worker.id_front_path[index]) : null,
            back_url: (worker.id_back_path || [])[index] != null ? assetUrl('public/storage/' + worker.id_back_path[index]) : null,
          });
        });
      }

      const ref = userModel.referredBy ? userModel.referredBy.toJSON() : null;
      const adder = userModel.addedBy ? userModel.addedBy.toJSON() : null;
      data.push({
        id: user.id,
        worker_id: worker ? worker.id : null,
        public_id: user.public_id,

        refer_by: ref ? {
          id: ref.id, name: ref.name, firm: ref.firm, phone: ref.phone,
          role: userModel.referredBy.role ? userModel.referredBy.role.slug : null, referral_code: ref.referral_code,
        } : null,

        added_by: adder ? { id: adder.id, name: adder.name, public_id: adder.public_id } : null,

        name: user.name,
        email: user.email,
        phone: user.phone,
        emergency_contact: user.emergency_contact,
        is_active: user.is_active,
        is_assigned: user.is_assigned,

        date_of_joining: user.date_of_joining,
        monthly_salary: user.monthly_salary,

        categories,
        services,

        city: user.city,
        zone: user.zone,
        area: user.area,

        wallet_balance: worker ? worker.wallet_balance : null,
        kyc_status: worker ? worker.kyc_status : null,

        photo: worker && worker.photo ? assetUrl('storage/' + worker.photo) : null,
        current_address: worker ? worker.current_address : null,
        permanent_address: worker ? worker.permanent_address : null,

        documents,

        ratings: { average: ratingsAvg, count: ratings.length },

        worker_availablillity: availByUser[user.id] || [],
      });
    }

    // FINAL RESPONSE
    const last = Math.max(Math.ceil(total / perPage), 1);
    const base = `${req.baseUrl || ''}${req.path || ''}`;
    const pageUrl = (p) => `${require('../../config').appUrl}${base}?page=${p}`;
    return res.json({
      data,
      current_page: page,
      per_page: perPage,
      total,
      last_page: last,
      next_page_url: page < last ? pageUrl(page + 1) : null,
      prev_page_url: page > 1 ? pageUrl(page - 1) : null,
      stats,
    });
  },

  async unassigned_worker(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);

    // Parse time slot safely
    let bookingStart; let bookingEnd;
    try {
      [bookingStart, bookingEnd] = parseTimeSlot(booking.time_slot);
    } catch (e) {
      return res.status(422).json({ message: 'Invalid time slot format', time_slot: booking.time_slot });
    }

    const bookingDate = booking.booking_date;
    const dateStr = bookingDateStr(bookingDate);
    const serviceId = parseInt(booking.service_id, 10);

    const and = [];
    if (booking.city_id) and.push({ city_id: booking.city_id });
    and.push(jsonContains('`User`.`service_ids`', serviceId));
    and.push(literal(`NOT EXISTS (SELECT 1 FROM bookings b WHERE b.worker_id = \`User\`.\`id\` AND b.booking_date = ${esc(dateStr)} AND b.status NOT IN ('cancelled') AND (SUBSTRING_INDEX(b.time_slot, '-', 1) < ${esc(bookingEnd)} AND SUBSTRING_INDEX(b.time_slot, '-', -1) > ${esc(bookingStart)}))`));
    and.push({ is_active: 1 });

    // SEARCH
    if (req.filled('search')) {
      const s = `%${req.input('search')}%`;
      and.push({ [Op.or]: [{ name: { [Op.like]: s } }, { phone: { [Op.like]: s } }, { public_id: { [Op.like]: s } }] });
    }
    // CATEGORY FILTER
    if (req.filled('category_id')) and.push(jsonContains('`User`.`category_ids`', parseInt(req.input('category_id'), 10) || 0));
    // SERVICE FILTER
    if (req.filled('service_id')) and.push(jsonContains('`User`.`service_ids`', parseInt(req.input('service_id'), 10) || 0));

    const rows = await User.findAll({ where: { [Op.and]: and }, attributes: ['id', 'name', 'phone'] });
    const workers = [];
    for (const worker of rows) {
      const jobsCompleted = await Booking.count({
        where: {
          [Op.and]: [
            { [Op.or]: [{ worker_id: worker.id }, jsonContains('`Booking`.`worker_ids`', worker.id)] },
            { status: 'completed' },
          ],
        },
      });
      workers.push({ ...worker.toJSON(), jobs_completed: jobsCompleted });
    }

    return res.json({
      booking: { id: booking.id, service_id: serviceId, date: bookingDate, time_slot: booking.time_slot },
      available_workers: workers,
    });
  },

  async instantWorker(req, res) {
    const now = dayjs();
    const nowDate = now.format('YYYY-MM-DD');

    let targetDate = req.input('date', nowDate) || nowDate;
    const requestedTimeSlot = req.input('time_slot');
    const cityId = req.input('city_id') ? parseInt(req.input('city_id'), 10) : null;

    const parsedDate = carbonParseDate(targetDate);
    if (!parsedDate) {
      return res.json({ available: false, message: 'Invalid date format' });
    }
    targetDate = parsedDate;

    if (targetDate < nowDate) {
      return res.json({ available: false, message: 'Cannot book for past dates' });
    }

    if (targetDate === nowDate && now.hour() >= 18) {
      return res.json({
        available: false,
        message: 'Today booking is closed after 6 PM.',
        can_book_future: true,
        next_available_date: now.add(1, 'day').format('YYYY-MM-DD'),
      });
    }

    const isToday = targetDate === nowDate;
    let windowStart; let windowEnd;

    if (requestedTimeSlot) {
      try {
        const [requestedStart, requestedEnd] = parseTimeSlot(requestedTimeSlot);

        if (requestedStart < '09:00' || requestedEnd > '18:00') {
          return res.json({
            available: false,
            message: 'Time slot must be between 9:00 AM and 6:00 PM',
            requested_time_slot: requestedTimeSlot,
          });
        }
        windowStart = requestedStart;
        windowEnd = requestedEnd;
      } catch (e) {
        return res.json({ available: false, message: 'Invalid time slot format', requested_time_slot: requestedTimeSlot });
      }
    } else {
      windowStart = isToday ? now.format('HH:mm') : '09:00';
      windowEnd = '18:00';
    }

    // Get Instant Help Category
    const category = await ServiceCategory.findOne({
      where: { name: 'Instant Help' },
      include: [{ model: Service, as: 'services', required: false }],
    });
    if (!category) return res.json({ available: false, message: 'Worker is not available' });

    const serviceIds = (category.services || []).map((s) => s.id);
    if (!serviceIds.length) return res.json({ available: false, message: 'Worker is not available' });

    // Get BUSY worker IDs from bookings using worker_ids JSON column
    const busyRows = await sequelize.query(
      `SELECT worker_ids FROM bookings WHERE booking_date = ? AND status NOT IN ('cancelled')
        AND SUBSTRING_INDEX(time_slot, '-', 1) < ? AND SUBSTRING_INDEX(time_slot, '-', -1) > ?`,
      { replacements: [targetDate, windowEnd, windowStart], type: QueryTypes.SELECT }
    );
    const busyWorkerIds = [...new Set(busyRows.flatMap((b) => asArray(b.worker_ids)))];

    // Get active workers NOT in busy list, scoped to the requested city
    const and = [{ is_active: 1 }];
    if (cityId) and.push({ city_id: cityId });
    if (busyWorkerIds.length) and.push({ id: { [Op.notIn]: busyWorkerIds } });
    and.push({ [Op.or]: serviceIds.map((sid) => jsonContains('`User`.`service_ids`', sid)) });
    const workers = await User.findAll({
      where: { [Op.and]: and },
      include: [{ model: WorkerAvailability, as: 'worker_availablillity', required: false }],
      order: [['id', 'ASC']],
    });

    const availableWorkers = [];
    for (const worker of workers) {
      for (const availability of worker.worker_availablillity || []) {
        if (!availability.status) continue;

        if (!asArray(availability.available_dates).includes(targetDate)) continue;

        for (const slot of asArray(availability.available_times)) {
          const start = slot.start;
          const end = slot.end;

          if (start <= windowEnd && end >= windowStart) {
            availableWorkers.push({
              worker_id: worker.id,
              worker_name: worker.name,
              time_window: {
                start: start > windowStart ? start : windowStart,
                end: end < windowEnd ? end : windowEnd,
              },
            });
            break; // break inner loop only, move to next availability
          }
        }
      }
    }

    // If workers found
    if (availableWorkers.length) {
      return res.json({
        available: true,
        date: targetDate,
        total_workers: availableWorkers.length,
        workers: availableWorkers,
        message: isToday ? 'Workers are available' : 'Workers are available on ' + dayjs(targetDate).format('DD MMM YYYY'),
        requested_time_slot: requestedTimeSlot,
      });
    }

    // No workers available
    return res.json({
      available: false,
      date: targetDate,
      message: isToday ? 'No worker available today in selected time' : 'No worker available on ' + dayjs(targetDate).format('DD MMM YYYY'),
      time_window: { start: windowStart, end: windowEnd },
      requested_time_slot: requestedTimeSlot,
    });
  },

  async store(req, res) {
    await validate(req, {
      name: 'required',
      phone: 'required|unique:users',
      password: 'required|min:6',
    });

    // 'role' is not in User::$fillable, so Eloquent silently drops it
    const user = await User.create({
      name: req.input('name'),
      phone: req.input('phone'),
      emergency_contact: req.input('emergency_contact'),
      password: hash.make(req.input('password')),
    });

    await Worker.create({ user_id: user.id, service_category: req.input('service_category') });

    return res.json({ message: 'Worker created' });
  },

  // GET /admin/workers/:id (the PHP controller had no show() - the route always returned 500)
  async show(req, res) {
    const user = await User.findOne({ where: { id: req.params.id }, include: [{ model: Worker, as: 'worker', required: false }, { model: City, as: 'city', required: false }] });
    if (!user) return res.status(404).json({ message: 'No query results for model [App\\Models\\User] ' + req.params.id });
    return res.json(user);
  },

  async updateStatus(req, res) {
    const user = await findOrFail(User, req.params.id);
    await user.update({ is_active: !user.is_active });
    return res.json({ message: 'Status updated' });
  },

  // DELETE /admin/workers/:id - soft delete + deactivate (recoverable; the PHP route always returned 500)
  async destroy(req, res) {
    const user = await findOrFail(User, req.params.id);
    await user.update({ is_active: false });
    await user.destroy();
    return res.json({ message: 'Worker deleted' });
  },
};
