// Port of App\Http\Controllers\Attendance\AttendanceController
const { Op, fn, col, where: sqlWhere, literal } = require('sequelize');
const { AttendanceLog, Role, Setting, User, Zone, City } = require('../../models');
const { dayjs } = require('../../utils/time');
const { validate } = require('../../utils/validate');
const paginate = require('../../utils/paginate');
const { getScopedCityId } = require('../../utils/cityScoped');
const ImageUploadHelper = require('../../helpers/ImageUploadHelper');

const DEFAULT_RADIUS_M = 500;

const today = () => dayjs().format('YYYY-MM-DD');
const deg2rad = (d) => (d * Math.PI) / 180;

// Haversine formula - returns distance in metres (int)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = deg2rad(lat1);
  const p2 = deg2rad(lat2);
  const dp = deg2rad(lat2 - lat1);
  const dl = deg2rad(lon2 - lon1);

  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Validate GPS against office - returns { distance } or { error: {status, body} }
async function verifyLocation(req) {
  const officeLat = await Setting.get('office_latitude');
  const officeLon = await Setting.get('office_longitude');
  const radiusM = parseInt(await Setting.get('office_radius_m', DEFAULT_RADIUS_M), 10) || 0;

  if (officeLat === null || officeLat === undefined || officeLon === null || officeLon === undefined) {
    return {
      error: { status: 422, body: { success: false, message: 'Office location is not configured. Please contact admin.' } },
    };
  }

  const distance = haversine(
    parseFloat(req.input('lat')), parseFloat(req.input('lon')), parseFloat(officeLat), parseFloat(officeLon)
  );

  if (distance > radiusM) {
    return {
      error: {
        status: 422,
        body: {
          success: false,
          message: 'You are outside the allowed radius.',
          distance_m: distance,
          allowed_radius_m: radiusM,
        },
      },
    };
  }

  return { distance };
}

// $request->get('per_page', $def) passed to paginate(int|null): non-numeric -> TypeError (500), null/0 -> 15, negative -> SQL error (500)
const perPageOf = (req, def) => {
  const v = req.query.per_page;
  if (v === undefined) return def;
  if (v === null) return 15;
  if (typeof v !== 'string' || !/^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/.test(v)) throw new Error('paginate(): Argument #1 ($perPage) must be of type ?int');
  const n = Math.trunc(Number(v));
  if (n === 0) return 15;
  if (n < 0) throw new Error('SQLSTATE[42000]: Syntax error or access violation: 1064 (negative limit)');
  return n;
};
const dateOnly = (v) => sqlWhere(fn('DATE', col('AttendanceLog.date')), v.op, v.value);

module.exports = {
  async checkin(req, res) {
    await validate(req, {
      lat: 'required|numeric|between:-90,90',
      lon: 'required|numeric|between:-180,180',
      photo: 'required|image|mimes:jpeg,jpg,png|max:2048',
    });

    const worker = req.user;
    const day = today();

    const existing = await AttendanceLog.findOne({ where: { worker_id: worker.id, date: day } });

    if (existing && existing.check_in_at !== null && existing.check_in_at !== undefined) {
      return res.status(422).json({ success: false, message: 'You have already checked in today.' });
    }

    const loc = await verifyLocation(req);
    if (loc.error) return res.status(loc.error.status).json(loc.error.body);

    const photoFile = (req.files || []).find((f) => f.fieldname === 'photo');
    const photoUrl = await ImageUploadHelper.uploadCompressed(photoFile, 'attendance');

    // AttendanceLog::updateOrCreate(['worker_id','date'], [...])
    const values = {
      zone_id: worker.zone_id,
      check_in_at: new Date(),
      check_in_lat: req.input('lat'),
      check_in_lon: req.input('lon'),
      check_in_distance_m: loc.distance,
      check_in_photo: photoUrl,
    };
    let log = existing;
    if (log) await log.update(values);
    else log = await AttendanceLog.create({ worker_id: worker.id, date: day, ...values });

    return res.status(201).json({ success: true, message: 'Check-in recorded successfully.', data: log });
  },

  async checkout(req, res) {
    await validate(req, {
      lat: 'required|numeric|between:-90,90',
      lon: 'required|numeric|between:-180,180',
    });

    const worker = req.user;

    const log = await AttendanceLog.findOne({ where: { worker_id: worker.id, date: today() } });

    if (!log || log.check_in_at === null || log.check_in_at === undefined) {
      return res.status(422).json({ success: false, message: 'You have not checked in today.' });
    }

    if (log.check_out_at !== null && log.check_out_at !== undefined) {
      return res.status(422).json({ success: false, message: 'You have already checked out today.' });
    }

    const loc = await verifyLocation(req);
    if (loc.error) return res.status(loc.error.status).json(loc.error.body);

    await log.update({
      check_out_at: new Date(),
      check_out_lat: req.input('lat'),
      check_out_lon: req.input('lon'),
      check_out_distance_m: loc.distance,
    });

    await log.reload();
    return res.json({ success: true, message: 'Check-out recorded successfully.', data: log });
  },

  // Worker: own attendance history
  async myAttendance(req, res) {
    const logs = await paginate(AttendanceLog, req, {
      where: { worker_id: req.user.id },
      order: [['date', 'DESC']],
      perPage: perPageOf(req, 15),
    });

    return res.json({ success: true, data: logs });
  },

  // Admin: all workers attendance
  async allAttendance(req, res) {
    const where = {};
    if (req.filled('worker_id')) where.worker_id = req.input('worker_id');
    if (req.filled('date')) where.date = req.input('date');
    if (req.filled('zone_id')) where.zone_id = req.input('zone_id');

    const data = await paginate(AttendanceLog, req, {
      where,
      include: [
        { model: User, as: 'worker', attributes: ['id', 'name', 'phone'] },
        { model: Zone, as: 'zone', attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC']],
      perPage: perPageOf(req, 20),
    });

    return res.json({ success: true, data });
  },

  // Admin: list of workers (to pick one and view their attendance)
  async workersList(req, res) {
    const workerRole = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
    const workerRoleId = workerRole ? workerRole.id : null;

    const where = { role_id: workerRoleId };
    const and = [];

    // City scoping: city-locked roles see only their city; super-admin can pass ?city_id=
    const cityId = getScopedCityId(req);
    if (cityId) where.city_id = cityId;

    if (req.filled('search')) {
      const search = req.input('search');
      and.push({ [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { phone: { [Op.like]: `%${search}%` } }] });
    }

    if (req.filled('zone_id')) where.zone_id = req.input('zone_id');
    if (and.length) where[Op.and] = and;

    const data = await paginate(User, req, {
      where,
      attributes: {
        include: [[literal('(select count(*) from `attendance_logs` where `User`.`id` = `attendance_logs`.`worker_id`)'), 'attendance_logs_count']],
      },
      include: [{ model: City, as: 'city', attributes: ['id', 'name'] }],
      order: [['name', 'ASC']],
      perPage: perPageOf(req, 20),
    });

    // ->select('id','name','phone','city_id')
    data.data = data.data.map((u) => {
      const j = u.toJSON();
      return {
        id: j.id, name: j.name, phone: j.phone, city_id: j.city_id,
        attendance_logs_count: Number(j.attendance_logs_count),
        city: j.city,
      };
    });

    return res.json({ success: true, data });
  },

  // Admin: attendance of a single worker (paginated)
  async workerAttendance(req, res) {
    const worker = await User.findByPk(req.params.workerId, { attributes: ['id', 'name', 'phone', 'city_id'] });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    // City scoping: city-locked roles can only view workers in their own city
    const cityId = getScopedCityId(req);
    if (cityId) {
      if (Number(worker.city_id) !== cityId) {
        return res.status(403).json({ success: false, message: 'You are not allowed to view this worker.' });
      }
    }

    const where = { worker_id: worker.id };
    const and = [];

    // Today only
    if (req.boolean('today')) where.date = today();

    // Exact / particular date (e.g. ?date=2026-06-29)  (later where on the same column ANDs with the previous)
    if (req.filled('date')) and.push({ date: req.input('date') });

    // Date range
    if (req.filled('date_from')) and.push(dateOnly({ op: Op.gte, value: req.input('date_from') }));
    if (req.filled('date_to')) and.push(dateOnly({ op: Op.lte, value: req.input('date_to') }));

    // Zone
    if (req.filled('zone_id')) where.zone_id = req.input('zone_id');

    // Status: present (checked in), checked_out (completed), pending (in but not out)
    if (req.filled('status')) {
      switch (req.input('status')) {
        case 'present':
          and.push({ check_in_at: { [Op.ne]: null } });
          break;
        case 'checked_out':
          and.push({ check_out_at: { [Op.ne]: null } });
          break;
        case 'pending':
          and.push({ check_in_at: { [Op.ne]: null } }, { check_out_at: null });
          break;
        default:
      }
    }
    if (and.length) where[Op.and] = and;

    const data = await paginate(AttendanceLog, req, {
      where,
      include: [{ model: Zone, as: 'zone', attributes: ['id', 'name'] }],
      order: [['date', 'DESC']],
      perPage: perPageOf(req, 20),
    });

    return res.json({ success: true, worker, data });
  },

  // Admin: set office location
  async setOfficeLocation(req, res) {
    const data = await validate(req, {
      latitude: 'required|numeric|between:-90,90',
      longitude: 'required|numeric|between:-180,180',
      radius_m: 'nullable|integer|min:50',
    });

    await Setting.set('office_latitude', String(data.latitude), 'Office location latitude');
    await Setting.set('office_longitude', String(data.longitude), 'Office location longitude');

    const hasRadius = data.radius_m !== undefined && data.radius_m !== null;
    if (hasRadius) {
      await Setting.set('office_radius_m', String(data.radius_m), 'Allowed check-in radius in metres');
    }

    return res.json({
      success: true,
      message: 'Office location updated.',
      latitude: data.latitude,
      longitude: data.longitude,
      radius_m: hasRadius ? data.radius_m : parseInt(await Setting.get('office_radius_m', DEFAULT_RADIUS_M), 10) || 0,
    });
  },

  // Admin: get office location
  async getOfficeLocation(req, res) {
    return res.json({
      success: true,
      latitude: await Setting.get('office_latitude'),
      longitude: await Setting.get('office_longitude'),
      radius_m: parseInt(await Setting.get('office_radius_m', DEFAULT_RADIUS_M), 10) || 0,
    });
  },
};
