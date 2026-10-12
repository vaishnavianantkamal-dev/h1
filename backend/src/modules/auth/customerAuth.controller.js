const config = require('../../config');
// Port of App\Http\Controllers\Auth\CustomerAuthController
// (the *_old methods are not routed in Laravel and are not ported)
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const { User, Role, Referral, Customer, OtpVerification } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const { HttpError } = require('../../utils/errors');
const { dayjs } = require('../../utils/time');
const { createToken } = require('../../middleware/auth');
const otpService = require('../../services/OtpService');

// STATIC LOGIN CREDENTIALS (Play Store / Review Mode)
// These ALWAYS work alongside real OTP login simultaneously.
// Real users with real OTPs are completely unaffected.
const STATIC_PHONE = '9999999999';
const STATIC_OTP = '123456';
const STATIC_EMAIL = 'testuser@example.com';

const DT = 'YYYY-MM-DD HH:mm:ss';
const nowStr = () => dayjs().format(DT);
const randomString = (n) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i += 1) s += chars[crypto.randomInt(chars.length)];
  return s;
};

// Check if the phone is the hardcoded static test number.
const isStaticPhone = (phone) => config.staticLoginEnabled && phone === STATIC_PHONE;

// Check if phone + OTP match the hardcoded static credentials.
const isStaticLogin = (phone, otp) => config.staticLoginEnabled && phone === STATIC_PHONE && otp === STATIC_OTP;

const phoneTypes = ['whatsapp', 'sms'];

// OtpVerification $fillable (mass assignment drops anything else, e.g. email)
const OTP_FILLABLE = ['phone', 'otp', 'expires_at', 'attempts', 'ip_address'];
const fillable = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => OTP_FILLABLE.includes(k)));

// req.user is loaded with role + permissions; Laravel's $request->user() has no relations loaded
const plainUser = (user) => {
  const json = user.toJSON();
  delete json.role;
  return json;
};

// User::creating hook reads $user->role, so a freshly created user carries the loaded `role` relation (kept by refresh())
const withCreatedRole = async (user, created) => {
  const json = user.toJSON();
  if (created) {
    const role = user.role_id ? await Role.findByPk(user.role_id) : null;
    json.role = role ? role.toJSON() : null;
  }
  return json;
};

const roleId = async (slug) => {
  const role = await Role.findOne({ where: { slug }, attributes: ['id'] });
  return role ? role.id : null;
};

/**
 * Save referral points if a valid refer code is passed and user not already referred.
 * Shared by both static and real OTP flows.
 */
async function handleReferral(req, user) {
  if (!req.filled('refer') || user.referred_by) {
    return;
  }

  await sequelize.transaction(async (t) => {
    const referrer = await User.findOne({ where: { referral_code: req.input('refer') }, transaction: t });

    if (!referrer || Number(referrer.id) === Number(user.id)) {
      return;
    }

    const referrerRole = referrer.role_id ? await Role.findByPk(referrer.role_id, { transaction: t }) : null;
    const allowedTypes = ['workers', 'customers', 'contractors'];
    const referrerType = referrerRole && allowedTypes.includes(referrerRole.slug) ? referrerRole.slug : 'customers';

    const userRole = user.role_id ? await Role.findByPk(user.role_id, { transaction: t }) : null;
    let userType;
    switch (userRole && userRole.slug) {
      case 'workers': userType = 'workers'; break;
      case 'contractors': userType = 'contractors'; break;
      case 'customer':
      case 'customers': userType = 'customers'; break;
      default: userType = 'customers';
    }

    await user.update({
      referred_by: referrer.id,
      referred_by_type: referrerType,
    }, { transaction: t });

    await referrer.increment('referral_points', { by: 10, transaction: t });

    await Referral.create({
      referrer_id: referrer.id,
      referrer_type: referrerType,
      referred_user_id: user.id,
      referred_user_type: userType,
      points: 10,
    }, { transaction: t });
  });
}

/**
 * Build the derived membership block returned at login and on the profile.
 * Returns is_member=false / valid_until=null for non-members.
 */
async function membershipPayload(user) {
  const validUntil = await user.membershipValidUntil();
  const isNull = validUntil === null || validUntil === undefined;

  return {
    is_member: !isNull,
    valid_until: isNull ? null : validUntil,
  };
}

module.exports = {
  // =========================================================
  //  SEND OTP
  //  - Static phone 9999999999 -> skip, fake success
  //  - Any real phone          -> normal OTP flow
  // =========================================================
  async sendOtp(req, res) {
    await validate(req, {
      phone: 'required|digits:10',
      type: 'nullable|in:whatsapp,sms', // optional, defaults to sms
    });

    const sendVia = req.input('type', 'sms') || 'sms'; // default = sms
    console.log(`sendVia value: ${sendVia} | type input: ${req.input('type')}`);

    // STATIC PHONE: return fake success without sending anything
    if (isStaticPhone(req.input('phone'))) {
      return res.json({
        status: true,
        message: `OTP sent successfully via ${sendVia}`,
      });
    }

    // REAL PHONE
    const workerRoleId = await roleId('workers');

    const existingUser = await User.findOne({ where: { phone: req.input('phone') } });
    if (existingUser && existingUser.role_id == workerRoleId) { // eslint-disable-line eqeqeq
      return res.status(403).json({
        status: false,
        message: 'This number is registered as a worker. OTP not allowed.',
      });
    }

    const rawPhone = String(req.input('phone')).replace(/\D/g, '');
    const localPhone = rawPhone.slice(-10);

    const otpRow = await OtpVerification.findOne({ where: { phone: localPhone } });
    let attempts;
    let lastSentAt;
    if (otpRow) {
      attempts = parseInt(otpRow.attempts ?? 0, 10) || 0;
      lastSentAt = otpRow.updated_at ?? otpRow.created_at;

      if (attempts >= 3 && lastSentAt && dayjs(lastSentAt).isAfter(dayjs().subtract(2, 'minute'))) {
        return res.status(429).json({
          status: false,
          message: 'Too many OTP requests. Please wait 2 minutes before trying again.',
        });
      }
    }

    const otp = await otpService.generateOtp();

    let newAttempts = 1;
    if (attempts !== undefined) {
      newAttempts = (attempts >= 3 && lastSentAt && !dayjs(lastSentAt).isAfter(dayjs().subtract(2, 'minute')))
        ? 1
        : attempts + 1;
    }

    const values = {
      otp,
      expires_at: dayjs().add(5, 'minute').format(DT),
      attempts: newAttempts,
      ip_address: String(req.ip || '').replace(/^::ffff:/, ''),
    };
    if (otpRow) await otpRow.update(values);
    else await OtpVerification.create({ phone: localPhone, ...values });

    // Send via SMS (default) or WhatsApp based on type
    if (sendVia === 'sms') {
      await otpService.sendSmsOtp(req.input('phone'), otp);
    } else {
      await otpService.sendWhatsappOtp(req.input('phone'), otp);
    }

    return res.json({
      status: true,
      message: `OTP sent successfully via ${sendVia}`,
    });
  },

  // =========================================================
  //  VERIFY OTP
  //
  //  Accepts:
  //    type    => whatsapp | sms | email  (required)
  //    phone   => 10 digits               (required if whatsapp or sms)
  //    email   => valid email             (required if email)
  //    otp     => 6 digits                (required)
  //    name    => string                  (optional)
  //    refer   => string                  (optional referral code)
  //
  //  Static credentials always accepted alongside real OTP flow:
  //    phone = 9999999999, otp = 123456
  // =========================================================
  async verifyOtp(req, res) {
    // STEP 1: VALIDATE INPUT
    const rules = {
      type: 'required|in:whatsapp,sms,email',
      otp: 'required|digits:6',
      name: 'nullable|string|max:150',
      refer: 'nullable|string|max:50',
    };

    if (phoneTypes.includes(req.input('type'))) {
      rules.phone = 'required|digits:10';
    }

    if (req.input('type') === 'email') {
      rules.email = 'required|email';
    }

    await validate(req, rules);

    const type = req.input('type');

    // STATIC LOGIN - phone = 9999999999 AND otp = 123456
    if (phoneTypes.includes(type) && isStaticLogin(req.input('phone'), req.input('otp'))) {
      const customerRoleId = await roleId('customers');

      const [user, isNewUser] = await User.findOrCreate({
        where: { phone: STATIC_PHONE },
        defaults: {
          name: null,
          email: STATIC_EMAIL,
          role_id: customerRoleId,
          password: hash.make(randomString(32)),
          is_active: true,
        },
      });

      if (Number(user.role_id) !== Number(customerRoleId)) return res.status(403).json({ status: false, message: 'This number cannot use static login.' });

      await Customer.findOrCreate({ where: { user_id: user.id } });

      if (req.filled('name') && !user.name) {
        await user.update({ name: req.input('name') });
      }

      await handleReferral(req, user);

      const token = await createToken(user, 'api-token');

      await user.reload();

      return res.json({
        status: true,
        message: 'Login successful',
        token,
        is_new_user: isNewUser,
        user: await withCreatedRole(user, isNewUser),
        membership: await membershipPayload(user),
      });
    }

    // REAL OTP FLOW

    // STEP 2: FIND OTP IN DB
    const otpWhere = {
      otp: req.input('otp'),
      expires_at: { [Op.gte]: nowStr() },
    };

    if (phoneTypes.includes(type)) {
      otpWhere.phone = req.input('phone');
    } else {
      otpWhere.email = req.input('email');
    }

    const otpRow = await OtpVerification.findOne({ where: otpWhere });

    if (!otpRow) {
      return res.status(401).json({
        status: false,
        message: 'Invalid or expired OTP',
      });
    }

    // STEP 3: ROLES
    const customerRoleId = await roleId('customers');
    const workerRoleId = await roleId('workers');

    // STEP 4: FIND EXISTING USER
    let user = phoneTypes.includes(type)
      ? await User.findOne({ where: { phone: req.input('phone') } })
      : await User.findOne({ where: { email: req.input('email') } });

    // Block workers
    if (user && user.role_id == workerRoleId) { // eslint-disable-line eqeqeq
      return res.status(403).json({
        status: false,
        message: 'Worker login not allowed',
      });
    }

    // STEP 5: NEW USER -> CREATE with name if provided
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        name: req.filled('name') ? req.input('name') : null,
        phone: phoneTypes.includes(type) ? req.input('phone') : null,
        email: type === 'email' ? req.input('email') : null,
        role_id: customerRoleId,
        city_id: req.input('city_id'), // optional: city resolved from pincode by the app
        password: hash.make(randomString(32)),
        is_active: true,
      });

      await Customer.create({ user_id: user.id });
      isNewUser = true;
    } else if (req.filled('name') && !user.name) {
      // EXISTING USER -> update name only if they don't have one yet and name was passed
      await user.update({ name: req.input('name') });
    }

    // STEP 6: HANDLE REFERRAL
    await handleReferral(req, user);

    // STEP 7: TOKEN + OTP CLEANUP
    const token = await createToken(user, 'api-token');
    await otpRow.destroy();

    await user.reload();

    return res.json({
      status: true,
      message: 'Login successful',
      token,
      is_new_user: isNewUser,
      user: await withCreatedRole(user, isNewUser),
      membership: await membershipPayload(user),
    });
  },

  // =========================================================
  //  RESEND OTP
  //  - Static phone -> fake success, no real send
  //  - Real phone   -> normal flow
  // =========================================================
  async resendOtp(req, res) {
    const rules = {
      type: 'required|in:whatsapp,sms,email',
    };

    if (phoneTypes.includes(req.input('type'))) {
      rules.phone = 'required|digits:10';
    }

    if (req.input('type') === 'email') {
      rules.email = 'required|email';
    }

    await validate(req, rules);

    const type = req.input('type');

    // STATIC PHONE: fake resend, no actual message sent
    if (phoneTypes.includes(type) && isStaticPhone(req.input('phone'))) {
      return res.json({
        status: true,
        message: `OTP resent successfully via ${type}`,
      });
    }

    // REAL FLOW
    if (phoneTypes.includes(type)) {
      const phone = req.input('phone');
      const workerRoleId = await roleId('workers');

      const existingUser = await User.findOne({ where: { phone } });
      if (existingUser && existingUser.role_id == workerRoleId) { // eslint-disable-line eqeqeq
        return res.status(403).json({
          status: false,
          message: 'This number is registered as a worker. OTP cannot be sent.',
        });
      }

      await OtpVerification.destroy({ where: { phone } });

      const otp = await otpService.generateOtp();

      await OtpVerification.create(fillable({
        phone,
        otp,
        expires_at: dayjs().add(5, 'minute').format(DT),
      }));

      // Send via SMS or WhatsApp
      if (type === 'sms') {
        await otpService.sendSmsOtp(phone, otp);
      } else {
        await otpService.sendWhatsappOtp(phone, otp);
      }
    }

    if (type === 'email') {
      const email = req.input('email');

      await OtpVerification.destroy({ where: { email } });

      const otp = await otpService.generateOtp();

      // NOTE: 'email' is not in OtpVerification::$fillable, so (as in Laravel) it is silently dropped here.
      await OtpVerification.create(fillable({
        email,
        otp,
        expires_at: dayjs().add(5, 'minute').format(DT),
      }));

      await otpService.sendEmailOtp(email, otp);
    }

    return res.json({
      status: true,
      message: `OTP resent successfully via ${type}`,
    });
  },

  // =========================================================
  //  UPDATE NAME
  // =========================================================
  async updateName(req, res) {
    await validate(req, {
      name: 'required|string|max:150',
      gender: 'nullable|in:male,female,other',
      refer: 'nullable|string|max:50',
    });

    const user = req.user;

    if (user.name) {
      return res.status(400).json({
        status: false,
        message: 'Name already updated',
      });
    }

    await user.update({
      name: req.input('name'),
      gender: req.input('gender'),
    });

    await handleReferral(req, user);

    await user.reload();

    return res.json({
      status: true,
      message: 'Name updated successfully',
      user: plainUser(user),
    });
  },

  // =========================================================
  //  LOGOUT
  // =========================================================
  async logout(req, res) {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        status: false,
        message: 'User not authenticated',
      });
    }

    await req.accessToken.destroy();

    return res.json({
      status: true,
      message: 'Logged out successfully',
    });
  },

  // =========================================================
  //  GET PROFILE
  // =========================================================
  async getProfile(req, res) {
    const user = req.user;

    return res.json({
      status: true,
      user: plainUser(user),
      membership: await membershipPayload(user),
    });
  },

  // =========================================================
  //  UPDATE PROFILE
  // =========================================================
  async updateProfile(req, res) {
    const user = req.user;

    await validate(req, {
      name: 'sometimes|string|max:150',
      email: `sometimes|email|max:150|unique:users,email,${user.id}`,
      gender: 'sometimes|in:male,female,other',
    });

    await user.update(req.only('name', 'email', 'gender'));

    return res.json({
      status: true,
      message: 'Profile updated successfully',
      user: plainUser(user),
    });
  },

};
