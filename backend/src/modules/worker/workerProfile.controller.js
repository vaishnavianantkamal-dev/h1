// Port of App\Http\Controllers\Api\Worker\WorkerProfileController
const { Op, literal, where: sqlWhere, fn, col } = require('sequelize');
const {
  User, Worker, Service, ServiceCategory, Booking, BookingVisitOverride, BookingRating, Referral, Role, sequelize,
} = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const storage = require('../../utils/storage');
const { attr } = require('../../models/serializer');

// $user->hasRole($slug) / $user->role?->slug (works whether or not the role relation is loaded)
async function roleSlugOf(user) {
  if (!user) return null;
  if (user.role && user.role.slug) return user.role.slug;
  const role = await Role.findByPk(user.role_id);
  return role ? role.slug : null;
}
const ADMIN_SLUGS = ['super-admin', 'co-ordinators', 'operation-head', 'contractors'];

const todayStr = () => dayjs().format('YYYY-MM-DD');
const dateStr = (v) => dayjs(v).format('YYYY-MM-DD');
const isSet = (v) => v !== undefined && v !== null;

// Booking where worker_id = ? OR JSON_CONTAINS(worker_ids, ?)   (orWhereJsonContains)
const ownsBooking = (userId) => ({
  [Op.or]: [{ worker_id: userId }, literal(`JSON_CONTAINS(\`Booking\`.\`worker_ids\`, ${sequelize.escape(JSON.stringify(userId))})`)],
});
const bookingDate = () => fn('DATE', col('Booking.booking_date'));

// Laravel toArray() snake_cases relation keys
function snakeRelations(obj) {
  if (obj && Object.prototype.hasOwnProperty.call(obj, 'subscriptionType')) {
    obj.subscription_type = obj.subscriptionType;
    delete obj.subscriptionType;
  }
  return obj;
}

// $collection->min('field') / ->max('field') (ignores nulls)
function extreme(rows, field, dir) {
  let best = null;
  for (const r of rows) {
    const v = r[field];
    if (!isSet(v)) continue;
    if (best === null || (dir < 0 ? new Date(v) < new Date(best) : new Date(v) > new Date(best))) best = v;
  }
  return best;
}

const bookingIncludes = () => [
  { association: 'service', include: [{ association: 'subscription', required: false }], required: false },
  {
    association: 'services',
    required: false,
    separate: true,
    order: [['id', 'ASC']],
    include: [
      { association: 'service', required: false },
      { association: 'subscriptionType', required: false },
      { association: 'addon', required: false },
    ],
  },
];

// services[] as Laravel serialises them, with addon details enriched
function mapServiceLines(lines) {
  return lines.map((line) => {
    const item = snakeRelations(line.toJSON());
    if (line.is_addon && line.addon) {
      item.addon_name = line.addon.name;
      item.addon_price = line.addon.price;
      item.addon_qty = line.quantity;
    }
    return item;
  });
}

// ids column helper (users.category_ids / service_ids)
function normalizeIds(value) {
  if (!value || (Array.isArray(value) && !value.length) || value === '0' || value === 0) return [];

  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (e) { value = null; }
  }

  if (Array.isArray(value) && value.length && Array.isArray(value[0])) value = value[0];

  if (!Array.isArray(value)) return [];

  // FORCE INTEGER + REMOVE EMPTY
  return value.map((v) => parseInt(v, 10) || 0).filter(Boolean);
}

// $request->file('name') as PHP keeps it: key => file (id_front / id_front[] / id_front[n])
function filesByIndex(req, name) {
  const out = {};
  let next = 0;
  for (const f of req.files || []) {
    const raw = f.rawField || f.fieldname;
    const m = raw.match(/^([^[]+)(?:\[(\d*)\])?$/);
    if (!m || m[1] !== name) continue;
    if (m[2] !== undefined && m[2] !== '') {
      out[m[2]] = f;
      next = Math.max(next, Number(m[2]) + 1);
    } else {
      out[next] = f;
      next += 1;
    }
  }
  return out;
}

const asEntries = (v) => (Array.isArray(v) ? v.map((x, i) => [String(i), x]) : v && typeof v === 'object' ? Object.entries(v) : []);
const extOf = (file) => {
  const i = (file.originalname || '').lastIndexOf('.');
  return i >= 0 ? file.originalname.slice(i + 1) : '';
};
const phpTime = () => Math.floor(Date.now() / 1000);

const ctrl = {
  /** Update worker profile */
  async update(req, res) {
    const worker = await Worker.findOne({ where: { user_id: req.user.id } });

    await validate(req, {
      skills: 'array',
      preferred_area: 'string|nullable',
      available_days: 'array|nullable',
      available_time: 'array|nullable',
    });

    if (!worker) throw new Error('Call to a member function update() on null');
    await worker.update(req.only('skills', 'preferred_area', 'available_days', 'available_time'));

    return res.json({ success: true, message: 'Profile updated' });
  },

  /** Get own profile (worker + user data) */
  async me(req, res) {
    const user = await User.findByPk(req.user.id, {
      include: [
        { association: 'worker', required: false },
        { association: 'worker_availablillity', required: false },
        { association: 'city', attributes: ['id', 'name'], required: false },
        { association: 'zone', attributes: ['id', 'name'], required: false },
        { association: 'area', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!user.worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const worker = user.worker;
    const ratings = await BookingRating.findAll({ where: { worker_id: worker.id } });
    // averageRating(): round(avg('rating'), 1)
    const sum = ratings.reduce((a, r) => a + Number(r.rating), 0);
    const ratingsAvg = ratings.length ? Math.round((sum / ratings.length) * 10) / 10 : 0;
    const ratingsCount = ratings.length;

    // Categories & Services (from users table)
    const categoryIds = normalizeIds(user.category_ids);
    const serviceIds = normalizeIds(user.service_ids);

    const categories = !categoryIds.length
      ? []
      : (await ServiceCategory.findAll({ where: { id: { [Op.in]: categoryIds } }, attributes: ['id', 'name'] })).map((r) => r.toJSON());

    const services = !serviceIds.length
      ? []
      : (await Service.findAll({ where: { id: { [Op.in]: serviceIds } }, attributes: ['id', 'name'] })).map((r) => r.toJSON());

    // KYC Documents (formatted)
    const documents = [];
    if (Array.isArray(worker.id_type)) {
      worker.id_type.forEach((type, index) => {
        const num = Array.isArray(worker.id_number) ? worker.id_number[index] : undefined;
        const front = Array.isArray(worker.id_front_path) ? worker.id_front_path[index] : undefined;
        const back = Array.isArray(worker.id_back_path) ? worker.id_back_path[index] : undefined;
        documents.push({
          type,
          number: isSet(num) ? num : null,
          front_url: isSet(front) ? storage.assetUrl('public/storage/' + front) : null,
          back_url: isSet(back) ? storage.assetUrl('public/storage/' + back) : null,
        });
      });
    }

    const completedJobs = await Booking.count({
      where: { [Op.and]: [ownsBooking(user.id), { status: 'completed' }] },
    });

    return res.json({
      id: user.id,
      worker_id: worker.id,

      name: user.name,
      email: user.email,
      phone: user.phone,

      is_active: attr('User', 'is_active', user.is_active),
      is_assigned: attr('User', 'is_assigned', user.is_assigned),

      categories,
      services,

      city: user.city,
      zone: user.zone,
      area: user.area,

      wallet_balance: attr('Worker', 'wallet_balance', worker.wallet_balance),
      kyc_status: worker.kyc_status,
      photo: worker.photo ? storage.assetUrl('storage/' + worker.photo) : null,
      current_address: worker.current_address,
      permanent_address: worker.permanent_address,

      documents,
      jobs_completed: completedJobs,

      worker_availablillity: user.worker_availablillity,
      ratings,
      average_ratings: ratingsAvg,
      rating_count: ratingsCount,
    });
  },

  async uploadKyc(req, res) {
    const worker = await Worker.findOne({ where: { user_id: req.user.id } });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    await validate(req, {
      id_type: 'required|string',
      id_number: 'required|string',
      id_front: 'required|image|mimes:jpg,jpeg,png',
      id_back: 'nullable|image|mimes:jpg,jpeg,png',
    });

    // Base folder: uploads/workers/{worker_id}
    const basePath = `uploads/workers/${worker.id}`;
    const front = (req.files || []).find((f) => f.fieldname === 'id_front');
    const back = (req.files || []).find((f) => f.fieldname === 'id_back');

    // Store files
    const frontFileName = `id_front_${phpTime()}.${extOf(front)}`;
    const frontPath = storage.storePublic(front, basePath, frontFileName);

    let backPath = null;
    if (back) {
      const backFileName = `id_back_${phpTime()}.${extOf(back)}`;
      backPath = storage.storePublic(back, basePath, backFileName);
    }

    // Update worker KYC data
    await worker.update({
      id_type: req.input('id_type'),
      id_number: req.input('id_number'),
      id_front_path: frontPath,
      id_back_path: backPath,
      kyc_status: 'pending',
    });

    return res.json({
      success: true,
      message: 'KYC uploaded successfully. Waiting for approval.',
      documents: {
        id_front_url: storage.assetUrl('storage/' + frontPath),
        id_back_url: backPath ? storage.assetUrl('storage/' + backPath) : null,
      },
    });
  },

  // POST /worker/{user?}/docs
  async uploaddocs(req, res) {
    const user = req.params.user !== undefined ? await findOrFail(User, req.params.user) : null;
    const authSlug = await roleSlugOf(req.user);

    let worker;
    if (ADMIN_SLUGS.includes(authSlug)) {
      worker = user ? await Worker.findOne({ where: { user_id: user.id } }) : null;
    } else {
      worker = await Worker.findOne({ where: { user_id: req.user.id } });
    }

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const toArr = (v) => (Array.isArray(v) || (v && typeof v === 'object') ? v : [v]);
    const types = toArr(req.input('id_type') ?? []);
    const numbers = toArr(req.input('id_number') ?? []);
    const fronts = filesByIndex(req, 'id_front');
    const backs = filesByIndex(req, 'id_back');

    const typeEntries = asEntries(types);

    const existingTypes = worker.id_type ?? [];
    const existingNumbers = worker.id_number ?? [];
    const existingFronts = worker.id_front_path ?? [];
    const existingBacks = worker.id_back_path ?? [];

    if (typeEntries.length && !Array.isArray(existingTypes)) {
      throw new Error(`foreach() argument must be of type array|object, ${typeof existingTypes} given`);
    }

    const normalize = (v) => String(v ?? '').toLowerCase().replace(/ /g, '_');

    for (const [i, type] of typeEntries) {
      const safeType = normalize(type);

      let index = null;

      for (let k = 0; k < existingTypes.length; k += 1) {
        if (normalize(existingTypes[k]) === safeType) {
          index = k;
          break;
        }
      }

      if (index !== null) {
        // IF DOC EXISTS
        if (isSet(numbers[i])) existingNumbers[index] = numbers[i];
      } else {
        // NEW DOCUMENT
        existingTypes.push(type);
        existingNumbers.push(numbers[i] ?? '');
        existingFronts.push(null);
        existingBacks.push(null);

        index = existingTypes.length - 1;
      }

      // FRONT IMAGE
      if (isSet(fronts[i])) {
        const file = fronts[i];
        const name = `${safeType}_front_${phpTime()}_${i}.${extOf(file)}`;
        storage.storePublic(file, `uploads/workers/${worker.id}`, name);
        existingFronts[index] = `uploads/workers/${worker.id}/${name}`;
      }

      // BACK IMAGE
      if (isSet(backs[i])) {
        const file = backs[i];
        const name = `${safeType}_back_${phpTime()}_${i}.${extOf(file)}`;
        storage.storePublic(file, `uploads/workers/${worker.id}`, name);
        existingBacks[index] = `uploads/workers/${worker.id}/${name}`;
      }
    }

    // array_values(): drop holes
    const vals = (a) => Array.from(a).filter((_, idx) => idx in a);

    await worker.update({
      id_type: vals(existingTypes),
      id_number: vals(existingNumbers),
      id_front_path: vals(existingFronts),
      id_back_path: vals(existingBacks),
      kyc_status: 'pending',
    });

    return res.json({
      success: true,
      message: 'KYC updated successfully',
      documents_count: existingTypes.length,
    });
  },

  // GET /worker-bookings/{user?}
  async get_worker_bookings(req, res) {
    let user = req.params.user !== undefined ? await findOrFail(User, req.params.user) : null;
    const authSlug = await roleSlugOf(req.user);

    let worker;
    if (ADMIN_SLUGS.includes(authSlug)) {
      worker = user ? await Worker.findOne({ where: { user_id: user.id } }) : null;
    } else {
      worker = await Worker.findOne({ where: { user_id: req.user.id } });
      user = req.user;
    }

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const status = req.query.status ?? 'all';

    // check BOTH worker_id AND worker_ids JSON column
    const and = [ownsBooking(user.id)];

    switch (status) {
      case 'today':
        and.push(sqlWhere(bookingDate(), Op.eq, todayStr()));
        break;
      case 'upcoming':
        and.push(sqlWhere(bookingDate(), Op.gt, todayStr()), { status: { [Op.ne]: 'cancelled' } });
        break;
      case 'completed':
        and.push({ status: 'completed' });
        break;
      case 'cancelled':
        and.push({ status: 'cancelled' });
        break;
      case 'all':
      default:
        break;
    }

    const bookings = await Booking.findAll({ where: { [Op.and]: and }, order: [['created_at', 'DESC']] });

    const jobsCompleted = await Booking.count({
      where: { [Op.and]: [ownsBooking(user.id), { status: 'completed' }] },
    });

    return res.json({
      success: true,
      filter: status,
      worker: {
        id: user.id,
        name: user.name,
        wallet_balance: attr('Worker', 'wallet_balance', worker.wallet_balance),
        jobs_completed: jobsCompleted,
      },
      count: bookings.length,
      data: bookings,
    });
  },

  // GET /worker/bookings
  async getMyBookings(req, res) {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const status = req.query.status ?? 'all';

    // check both worker_id (primary) AND worker_ids (JSON array)
    const and = [ownsBooking(user.id)];

    switch (status) {
      case 'today':
        and.push(sqlWhere(bookingDate(), Op.eq, todayStr()));
        break;
      case 'upcoming':
        and.push(sqlWhere(bookingDate(), Op.gt, todayStr()), { status: { [Op.ne]: 'cancelled' } });
        break;
      case 'pending':
        and.push({ status: 'pending' });
        break;
      case 'assigned':
        and.push({ status: 'assigned' });
        break;
      case 'inprogress':
        and.push({ status: 'inprogress' });
        break;
      case 'completed':
        and.push({ status: 'completed' });
        break;
      case 'cancelled':
        and.push({ status: 'cancelled' });
        break;
      case 'rescheduled': {
        // Rescheduled = today's visit has a one-day override (monthly)
        // OR an upcoming single-visit booking that was rescheduled.
        const t = sequelize.escape(todayStr());
        and.push({
          [Op.or]: [
            literal(`EXISTS (SELECT 1 FROM \`booking_visit_overrides\` WHERE \`booking_visit_overrides\`.\`booking_id\` = \`Booking\`.\`id\` AND DATE(\`booking_visit_overrides\`.\`visit_date\`) = ${t})`),
            { [Op.and]: [{ reschedule_count: { [Op.gt]: 0 } }, sqlWhere(bookingDate(), Op.gte, todayStr())] },
          ],
        });
        break;
      }
      case 'all':
      default:
        break;
    }

    const bookings = await Booking.findAll({
      where: { [Op.and]: and },
      include: bookingIncludes(),
      order: [['created_at', 'DESC']],
    });

    // One-day reschedules (monthly subscriptions): upcoming overrides per booking, so the app
    // shows the real visit time and the "Rescheduled" badge immediately after a reschedule.
    const today = todayStr();
    const overridesRows = await BookingVisitOverride.findAll({
      where: {
        [Op.and]: [
          { booking_id: { [Op.in]: bookings.map((b) => b.id) } },
          sqlWhere(fn('DATE', col('visit_date')), Op.gte, today),
        ],
      },
      order: [['visit_date', 'ASC']],
    });
    const upcomingOverrides = {};
    overridesRows.forEach((o) => { (upcomingOverrides[o.booking_id] ||= []).push(o); });

    const transformed = bookings.map((booking) => {
      const services = booking.services || [];

      const startDate = extreme(services, 'start_date', -1) ?? booking.booking_date;
      const endDate = extreme(services, 'end_date', 1) ?? booking.booking_date;

      const data = booking.toJSON();
      data.start_date = startDate;
      data.end_date = endDate;

      // Effective time for TODAY's visit + "Rescheduled" badge flags.
      // status itself is never changed by a reschedule.
      const overrides = upcomingOverrides[booking.id] || [];
      const todayOv = overrides.find((o) => dateStr(o.visit_date) === today);
      const nextOv = overrides[0]; // nearest upcoming (list is >= today, sorted)

      data.effective_time_slot = todayOv?.time_slot ?? booking.time_slot;
      data.is_rescheduled_today = !!todayOv;
      data.next_visit_override = nextOv ? { visit_date: dateStr(nextOv.visit_date), time_slot: nextOv.time_slot } : null;
      // Badge shows IMMEDIATELY after any reschedule that is still relevant: an upcoming one-day
      // override (monthly) OR a moved single-visit booking that is today/upcoming (instant).
      data.is_rescheduled = !!nextOv
        || (parseInt(booking.reschedule_count, 10) > 0
          && !!booking.booking_date
          && dateStr(booking.booking_date) >= today);

      data.services = mapServiceLines(services);

      return data;
    });

    return res.json({
      success: true,
      filter: status,
      count: transformed.length,
      data: transformed,
    });
  },

  /**
   * GET /worker/available-bookings
   *
   * The "Available Jobs" feed for the broadcast (first-come-first-serve) flow: paid, status
   * pending/assigned, slots remaining, not already claimed/rejected by this worker, in the
   * worker's city (bookings with no city are shown to all).
   */
  async availableBookings(req, res) {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const uid = sequelize.escape(String(user.id));
    const cityOr = [{ city_id: null }];
    if (user.city_id) cityOr.push({ city_id: user.city_id });

    const bookings = await Booking.findAll({
      include: bookingIncludes(),
      where: {
        [Op.and]: [
          // Still fillable: unclaimed (pending) or partially staffed (assigned).
          { status: { [Op.in]: ['pending', 'assigned'] } },
          { payment_status: Booking.PAYMENT_PAID || 'paid' },
          // Slots remaining: fewer workers claimed than the booking needs.
          literal('JSON_LENGTH(COALESCE(`Booking`.`worker_ids`, "[]")) < COALESCE(`Booking`.`workers`, 1)'),
          // Hide bookings this worker has already claimed a slot in.
          literal(`NOT JSON_CONTAINS(COALESCE(\`Booking\`.\`worker_ids\`, "[]"), ${uid})`),
          // Hide bookings this worker has rejected (dismissed) from their feed.
          literal(`NOT JSON_CONTAINS(COALESCE(\`Booking\`.\`rejected_worker_ids\`, "[]"), ${uid})`),
          // Only today's and upcoming bookings; past-dated ones drop off the feed.
          sqlWhere(bookingDate(), Op.gte, todayStr()),
          // Same city as the worker, or bookings that have no city set.
          { [Op.or]: cityOr },
        ],
      },
      order: [['created_at', 'DESC']],
    });

    const transformed = bookings.map((booking) => {
      const services = booking.services || [];

      const startDate = extreme(services, 'start_date', -1) ?? booking.booking_date;
      const endDate = extreme(services, 'end_date', 1) ?? booking.booking_date;

      const required = parseInt(booking.workers, 10) || 1;
      const slotsTaken = (booking.worker_ids || []).length;

      const data = booking.toJSON();
      data.start_date = startDate;
      data.end_date = endDate;
      data.slots_required = required;
      data.slots_filled = slotsTaken;
      data.slots_remaining = Math.max(0, required - slotsTaken);
      data.claimable = slotsTaken < required;

      data.services = mapServiceLines(services);

      return data;
    });

    return res.json({ success: true, count: transformed.length, data: transformed });
  },

  // GET /worker/referrals  (registered without any auth middleware in routes/api.php; the default
  // "web" guard never resolves a bearer token, so auth()->user() is null there)
  async myReferrals(req, res) {
    const user = req.user || null;

    if (!user || (await roleSlugOf(user)) !== 'workers') {
      return res.status(403).json({ success: false, message: 'Only workers can access referrals' });
    }

    const refs = await Referral.findAll({ where: { referrer_id: user.id }, order: [['created_at', 'DESC']] });

    return res.json({
      success: true,
      points: user.referral_points ?? 0,
      referral_count: refs.length,
      data: refs,
    });
  },
};

module.exports = ctrl;
