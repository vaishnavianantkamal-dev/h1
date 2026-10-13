const config = require('../../config');
// Port of App\Http\Controllers\Api\Worker\WorkerAuthController
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, UserFcmToken, Worker, WorkerAvailability, Service, Role, Referral, OtpVerification, sequelize } = require('../../models');
const validate = require('../../utils/validate');
const { ValidationError, abort } = require('../../utils/errors');
const { findOrFail, firstOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const hash = require('../../utils/hash');
const storage = require('../../utils/storage');
const { createToken } = require('../../middleware/auth');
const otpService = require('../../services/OtpService');

// STATIC LOGIN CREDENTIALS (Play Store / Review Mode)
// These ALWAYS work alongside real OTP login simultaneously
const STATIC_PHONE = '8888888888';
const STATIC_OTP = '123456';

const cleanPhone = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const cleanOtp = (o) => String(o || '').trim();

const isStaticPhone = (phone) => config.staticLoginEnabled && cleanPhone(phone) === STATIC_PHONE;
const isStaticLogin = (phone, otp) => config.staticLoginEnabled && cleanPhone(phone) === STATIC_PHONE && cleanOtp(otp) === STATIC_OTP;

// $user->hasRole($slug) (works whether or not the role relation is loaded)
async function roleSlugOf(user) {
  if (!user) return null;
  if (user.role && user.role.slug) return user.role.slug;
  const role = await Role.findByPk(user.role_id);
  return role ? role.slug : null;
}
const hasRole = async (user, slug) => (await roleSlugOf(user)) === slug;

// Model::updateOrCreate
async function updateOrCreate(Model, where, values, options = {}) {
  const row = await Model.findOne({ where, ...options });
  if (row) {
    await row.update(values, options);
    return row;
  }
  return Model.create({ ...where, ...values }, options);
}

// Default availability: every date for one year from today, 09:00-18:00
function defaultAvailabilityForOneYear() {
  const dates = [];
  const start = dayjs().startOf('day');
  const end = start.add(1, 'year');
  for (let d = start; !d.isAfter(end); d = d.add(1, 'day')) dates.push(d.format('YYYY-MM-DD'));
  return { available_dates: dates, available_times: [{ start: '09:00', end: '18:00' }] };
}

// Eloquent QueryException message for a failed statement (e.g. Data truncated for an enum column)
function laravelQueryError(err, sql) {
  const p = err && (err.parent || err.original);
  if (!p || !p.errno) return err;
  const state = p.sqlState || 'HY000';
  const kind = state.startsWith('01') ? 'Warning' : 'General error';
  const cfg = require('../../config').db;
  return new Error('SQLSTATE[' + state + ']: ' + kind + ': ' + p.errno + ' ' + p.sqlMessage + ' (Connection: mysql, Host: ' + cfg.host + ', Port: ' + cfg.port + ', Database: ' + cfg.database + ', SQL: ' + sql + ')');
}

const randomStr = (n) => crypto.randomBytes(n).toString('hex').slice(0, n);
const photoFile = (req) => (req.files || []).find((f) => f.fieldname === 'photo');

const registerRules = {
  name: 'required|string',
  email: 'nullable|email|unique:users,email',
  phone: 'required|string|unique:users,phone',
  password: 'nullable|min:6',
  category_ids: 'required|array|min:1',
  'category_ids.*': 'exists:service_categories,id',
  service_ids: 'required|array|min:1',
  'service_ids.*': 'exists:services,id',
  city_id: 'nullable|exists:cities,id',
  zone_id: 'nullable|exists:zones,id',
  area_id: 'nullable|exists:serviceable_areas,id',
  is_active: 'sometimes|boolean',
  refer_by: 'nullable|string',
  ref: 'nullable|string|max:50',
  photo: 'nullable|image|mimes:jpg,jpeg,png|max:2048',
  current_address: 'nullable|string|max:500',
  permanent_address: 'nullable|string|max:500',
};

async function invalidServiceCheck(req) {
  // Validate service-category relation
  const invalid = await Service.findOne({
    where: {
      id: { [Op.in]: [].concat(req.input('service_ids')) },
      category_id: { [Op.notIn]: [].concat(req.input('category_ids')) },
    },
  });
  if (invalid) throw new ValidationError({ service_ids: ['One or more services do not belong to selected categories'] });
}

const ctrl = {
  async register(req, res) {
    await validate(req, {
      ...registerRules,
      date_of_joining: 'nullable|date',
      monthly_salary: 'nullable|numeric|min:0',
      available_dates: 'sometimes|array|min:1',
      'available_dates.*': 'date',
      available_times: 'sometimes|array|min:1',
      'available_times.*.start': 'required_with:available_times|date_format:H:i',
      'available_times.*.end': 'required_with:available_times|date_format:H:i',
    });

    await invalidServiceCheck(req);

    // Handle photo upload
    let photoPath = null;
    if (photoFile(req)) photoPath = storage.storePublic(photoFile(req), 'workers/photos');

    const t = await sequelize.transaction();
    try {
      const workerRole = await firstOrFail(Role, { where: { slug: 'workers' }, transaction: t });
      const auth = req.user;

      const user = await User.create({
        name: req.input('name'),
        email: req.input('email'),
        phone: req.input('phone'),
        emergency_contact: req.input('emergency_contact'),
        password: hash.make(req.input('password') ?? ''),
        role_id: workerRole.id,
        category_ids: req.input('category_ids'),
        service_ids: req.input('service_ids'),
        city_id: req.input('city_id'),
        zone_id: req.input('zone_id'),
        area_id: req.input('area_id'),
        added_by: auth.id,
        refer_by: req.input('refer_by'),
        date_of_joining: req.input('date_of_joining'),
        monthly_salary: req.input('monthly_salary'),
        is_active: req.input('is_active', 0),
      }, { transaction: t });

      const worker = await Worker.create({
        user_id: user.id,
        kyc_status: 'pending',
        photo: photoPath,
        current_address: req.input('current_address'),
        permanent_address: req.input('permanent_address'),
      }, { transaction: t });

      const defaultAvail = defaultAvailabilityForOneYear();
      await WorkerAvailability.create({
        worker_id: worker.user_id,
        available_dates: req.filled('available_dates') ? req.input('available_dates') : defaultAvail.available_dates,
        available_times: req.filled('available_times') ? req.input('available_times') : defaultAvail.available_times,
        status: true,
      }, { transaction: t });

      if (req.input('ref')) {
        const referrer = await User.findOne({ where: { referral_code: req.input('ref') }, transaction: t });

        if (referrer && referrer.phone !== req.input('phone')) {
          const referrerRole = await Role.findByPk(referrer.role_id, { transaction: t });

          if (referrerRole && ['contractors', 'agents'].includes(referrerRole.slug)) {
            await user.update({ referred_by: referrer.id, referred_by_type: referrerRole.slug }, { transaction: t });

            const points = 10;
            await referrer.increment('referral_points', { by: points, transaction: t });

            await Referral.create({
              referrer_id: referrer.id,
              referrer_type: referrerRole.slug,
              referred_user_id: user.id,
              referred_user_type: workerRole.slug,
              points,
            }, { transaction: t });
          }
        }
      }

      await t.commit();

      return res.status(201).json({
        success: true,
        worker_id: worker.id,
        public_id: user.public_id,
        token: await createToken(user, 'worker-token'),
        message: 'Worker registered successfully',
      });
    } catch (e) {
      await t.rollback();

      // Delete uploaded photo if transaction failed
      if (photoPath) storage.deletePublic(photoPath);

      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // REGISTER WORKER APP - unchanged
  async registerApp(req, res) {
    await validate(req, {
      ...registerRules,
      available_dates: 'required|array|min:1',
      'available_dates.*': 'date',
      available_times: 'required|array|min:1',
      'available_times.*.start': 'required|date_format:H:i',
      'available_times.*.end': 'required|date_format:H:i',
    });

    await invalidServiceCheck(req);

    let photoPath = null;
    if (photoFile(req)) photoPath = storage.storePublic(photoFile(req), 'workers/photos');

    const t = await sequelize.transaction();
    try {
      const workerRole = await firstOrFail(Role, { where: { slug: 'workers' }, transaction: t });

      const user = await User.create({
        name: req.input('name'),
        email: req.input('email'),
        phone: req.input('phone'),
        emergency_contact: req.input('emergency_contact'),
        password: hash.make(req.input('password') ?? ''),
        role_id: workerRole.id,
        category_ids: req.input('category_ids'),
        service_ids: req.input('service_ids'),
        city_id: req.input('city_id'),
        zone_id: req.input('zone_id'),
        area_id: req.input('area_id'),
        refer_by: req.input('refer_by'),
        is_active: 0, // self-registered workers stay inactive until KYC is approved (the client used to be able to set this)
      }, { transaction: t });

      const worker = await Worker.create({
        user_id: user.id,
        kyc_status: 'pending',
        photo: photoPath,
        current_address: req.input('current_address'),
        permanent_address: req.input('permanent_address'),
      }, { transaction: t });

      await WorkerAvailability.create({
        worker_id: worker.user_id,
        available_dates: req.input('available_dates'),
        available_times: req.input('available_times'),
        status: true,
      }, { transaction: t });

      if (req.input('ref')) {
        const referrer = await User.findOne({ where: { referral_code: req.input('ref') }, transaction: t });

        // Prevent self referral
        if (referrer && referrer.phone !== req.input('phone')) {
          const referrerRole = await findOrFail(Role, referrer.role_id, { transaction: t });
          try {
            await user.update({ referred_by: referrer.id, referred_by_type: referrerRole.slug }, { transaction: t });
          } catch (err) {
            throw laravelQueryError(err, 'update `users` set `referred_by` = ' + referrer.id + ', `referred_by_type` = ' + referrerRole.slug + ', `users`.`updated_at` = ' + dayjs().format('YYYY-MM-DD HH:mm:ss') + ' where `id` = ' + user.id);
          }

          const points = 10;
          await referrer.increment('referral_points', { by: points, transaction: t });

          await Referral.create({
            referrer_id: referrer.id,
            referrer_type: referrerRole.slug,
            referred_user_id: user.id,
            referred_user_type: workerRole.slug,
            points,
          }, { transaction: t });
        }
      }

      await t.commit();

      return res.status(201).json({
        success: true,
        worker_id: worker.id,
        public_id: user.public_id,
        token: await createToken(user, 'worker-token'),
        message: 'Worker registered successfully',
      });
    } catch (e) {
      await t.rollback();

      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // PUT|POST /admin/worker/{user?}/update
  async update(req, res) {
    let user = req.params.user !== undefined ? await findOrFail(User, req.params.user) : null;
    const authSlug = await roleSlugOf(req.user);

    if (['super-admin', 'co-ordinators', 'operation-head', 'contractors'].includes(authSlug)) {
      user = user || abort(404, 'Worker not found');
    } else {
      user = req.user;
    }

    if (!(await hasRole(user, 'workers'))) abort(403, 'Target user is not a worker');

    await validate(req, {
      name: 'sometimes|string',
      email: `nullable|email|unique:users,email,${user.id}`,
      phone: `sometimes|string|unique:users,phone,${user.id}`,
      password: 'sometimes|min:6',
      category_ids: 'sometimes|array|min:1',
      'category_ids.*': 'exists:service_categories,id',
      service_ids: 'sometimes|array|min:1',
      'service_ids.*': 'exists:services,id',
      city_id: 'nullable|exists:cities,id',
      zone_id: 'nullable|exists:zones,id',
      area_id: 'nullable|exists:serviceable_areas,id',
      date_of_joining: 'nullable|date',
      monthly_salary: 'nullable|numeric|min:0',
      available_dates: 'sometimes|array|min:1',
      'available_dates.*': 'date',
      available_times: 'sometimes|array|min:1',
      'available_times.*.start': 'required_with:available_times|date_format:H:i',
      'available_times.*.end': 'required_with:available_times|date_format:H:i',
      is_active: 'sometimes|boolean',
      refer_by: 'nullable|string',
      photo: 'nullable|image|mimes:jpg,jpeg,png|max:2048',
      current_address: 'nullable|string|max:500',
      permanent_address: 'nullable|string|max:500',
    });

    const t = await sequelize.transaction();
    try {
      const worker = await Worker.findOne({ where: { user_id: user.id }, transaction: t });

      // Base user fields
      const data = req.only(
        'name', 'email', 'phone', 'emergency_contact', 'category_ids', 'service_ids', 'city_id',
        'zone_id', 'area_id', 'refer_by', 'date_of_joining', 'monthly_salary',
      );

      if (req.has('is_active')) data.is_active = req.input('is_active');

      await user.update(data, { transaction: t });

      // Password update
      if (req.filled('password')) await user.update({ password: hash.make(req.input('password')) }, { transaction: t });

      // Worker profile update (photo, addresses)
      if (worker) {
        const workerData = {};

        if (photoFile(req)) {
          // Delete old photo if exists
          if (worker.photo) storage.deletePublic(worker.photo);
          workerData.photo = storage.storePublic(photoFile(req), 'workers/photos');
        }

        if (req.has('current_address')) workerData.current_address = req.input('current_address');
        if (req.has('permanent_address')) workerData.permanent_address = req.input('permanent_address');

        if (Object.keys(workerData).length) await worker.update(workerData, { transaction: t });
      }

      // Availability update
      if (req.has('available_dates') || req.has('available_times')) {
        await updateOrCreate(WorkerAvailability, { worker_id: user.id }, {
          available_dates: req.input('available_dates') ?? [],
          available_times: req.input('available_times') ?? [],
          status: user.is_active ? 1 : 0,
        }, { transaction: t });
      }

      await t.commit();

      return res.json({
        success: true,
        message: 'Worker updated successfully',
        data: await User.findByPk(user.id),
      });
    } catch (e) {
      await t.rollback();

      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // DELETE WORKER - unchanged
  async destroy(req, res) {
    const user = await findOrFail(User, req.params.user);
    const authUser = req.user;
    const authSlug = await roleSlugOf(authUser);

    if (authSlug !== 'super-admin' || (authSlug === 'contractors' && authUser.id !== user.id)) abort(403, 'Unauthorized');

    if (!(await hasRole(user, 'workers'))) abort(403, 'Target user is not a worker');

    await user.destroy();

    return res.json({ success: true, message: 'Worker deleted successfully' });
  },

  // 4 may rutuja
  async sendWorkerOtp(req, res) {
    await validate(req, {
      phone: 'required|digits:10',
      type: 'nullable|in:whatsapp,sms', // optional, defaults to sms
    });

    const sendVia = req.input('type', 'sms'); // default = sms

    // STATIC PHONE: return fake success without sending anything (unchanged)
    if (isStaticPhone(req.input('phone'))) {
      await updateOrCreate(OtpVerification, { phone: STATIC_PHONE }, {
        otp: STATIC_OTP,
        expires_at: dayjs().add(1, 'year').format('YYYY-MM-DD HH:mm:ss'),
        attempts: 0,
      }).catch(() => {});
      return res.json({ status: true, message: 'OTP sent successfully via ' + (sendVia ?? '') });
    }

    // REAL PHONE: original logic (unchanged). (The PHP also looked the worker up here but never used it.)
    const otp = await otpService.generateOtp();

    await updateOrCreate(OtpVerification, { phone: req.input('phone') }, {
      otp,
      expires_at: dayjs().add(15, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    });

    // Send via SMS (default) or WhatsApp based on type
    if (sendVia === 'sms') await otpService.sendSmsOtp(req.input('phone'), otp);
    else await otpService.sendWhatsappOtp(req.input('phone'), otp);

    return res.json({ status: true, message: 'OTP sent successfully via ' + (sendVia ?? '') });
  },

  // 4 may rutuja
  async verifyWorkerOtp(req, res) {
    await validate(req, {
      phone: 'required|digits:10',
      otp: 'required|digits:6',
    });
    const phone = String(req.input('phone'));
    const otp = String(req.input('otp'));

    // STATIC LOGIN - completely unchanged
    if (isStaticLogin(phone, otp)) {
      const workerRoleId = (await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] }))?.id;
      let workerUser = await User.findOne({ where: { phone: STATIC_PHONE } });
      if (!workerUser) {
        workerUser = await User.create({
          phone: STATIC_PHONE,
          name: 'Test Worker',
          email: 'testworker@example.com',
          role_id: workerRoleId,
          password: hash.make('123456'),
          is_active: true,
          is_phone_verified: true,
          category_ids: [1, 2, 6],
          service_ids: [2, 26, 30, 31],
          city_id: 1,
        });
      } else {
        await workerUser.update({ is_active: true, is_phone_verified: true });
      }
      if (Number(workerUser.role_id) !== Number(workerRoleId)) return res.status(403).json({ status: false, message: 'This number cannot use static login.' });
      let existingWorker = await Worker.findOne({ where: { user_id: workerUser.id } });
      if (!existingWorker) {
        existingWorker = await Worker.create({
          user_id: workerUser.id,
          full_name: 'Test Worker',
          phone: STATIC_PHONE,
          kyc_status: 'approved',
          wallet_balance: 1000.00,
        });
      } else if (existingWorker.kyc_status !== 'approved') {
        await existingWorker.update({ kyc_status: 'approved' });
      }

      const defaultAvail = defaultAvailabilityForOneYear();
      await updateOrCreate(WorkerAvailability, { worker_id: workerUser.id }, {
        available_dates: defaultAvail.available_dates,
        available_times: defaultAvail.available_times,
        status: true,
      });

      return res.json({
        status: true,
        message: 'Worker login successful',
        token: await createToken(workerUser, 'worker-token'),
        data: {
          id: workerUser.id,
          name: workerUser.name,
          phone: workerUser.phone,
          role: await roleSlugOf(workerUser),
        },
      });
    }

    // REAL OTP FLOW - auto detect role from phone
    const allowedRoleIds = (await Role.findAll({
      where: { slug: { [Op.in]: ['workers', 'co-ordinators'] } },
      attributes: ['id'],
    })).map((r) => r.id);

    // Find user by phone across both roles
    const user = await User.findOne({ where: { phone, role_id: { [Op.in]: allowedRoleIds } } });

    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    const otpRecord = await OtpVerification.findOne({ where: { phone, otp } });

    if (!otpRecord) return res.status(401).json({ status: false, message: 'Invalid OTP' });

    if (dayjs().isAfter(dayjs(otpRecord.expires_at))) {
      return res.status(401).json({ status: false, message: 'OTP expired' });
    }

    await otpRecord.destroy();

    // Determine token name from actual role
    const roleSlug = await roleSlugOf(user);
    const tokenName = roleSlug === 'co-ordinators' ? 'coordinator-token' : 'worker-token';
    const message = roleSlug === 'co-ordinators' ? 'Coordinator login successful' : 'Worker login successful';

    return res.json({
      status: true,
      message,
      token: await createToken(user, tokenName),
      data: { id: user.id, name: user.name, phone: user.phone, role: roleSlug },
    });
  },

  // POST /worker/login/password - phone + password login for workers / co-ordinators / contractors
  // (the PHP route pointed at a method that did not exist, so it always failed with a 500)
  async loginWithPassword(req, res) {
    await validate(req, { phone: 'required|digits:10', password: 'required|string' });
    const allowed = (await Role.findAll({ where: { slug: { [Op.in]: ['workers', 'co-ordinators', 'contractors'] } }, attributes: ['id'] })).map((r) => r.id);
    const user = await User.findOne({ where: { phone: String(req.input('phone')), role_id: { [Op.in]: allowed } } });
    if (!user || !hash.check(req.input('password'), user.password)) return res.status(401).json({ status: false, message: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ status: false, message: 'Account is not active' });
    const roleSlug = await roleSlugOf(user);
    return res.json({
      status: true,
      message: roleSlug === 'co-ordinators' ? 'Coordinator login successful' : 'Worker login successful',
      token: await createToken(user, roleSlug === 'co-ordinators' ? 'coordinator-token' : 'worker-token'),
      data: { id: user.id, name: user.name, phone: user.phone, role: roleSlug },
    });
  },

  async updateFcmToken(req, res) {
    await validate(req, { fcm_token: 'required|string', device_name: 'nullable|string' });

    await updateOrCreate(UserFcmToken, { user_id: req.user.id, fcm_token: req.input('fcm_token') }, {
      device_name: req.input('device_name'),
      last_used_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

    return res.json({ success: true, message: 'FCM token updated.' });
  },

  async deleteFcmToken(req, res) {
    await validate(req, { fcm_token: 'required|string' });

    await UserFcmToken.destroy({ where: { user_id: req.user.id, fcm_token: req.input('fcm_token') } });

    return res.json({ success: true, message: 'FCM token removed.' });
  },
};

module.exports = ctrl;
