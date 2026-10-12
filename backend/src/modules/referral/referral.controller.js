// Port of App\Http\Controllers\Referral\ReferralController
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const { User, Role, Referral, Setting } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const paginate = require('../../utils/paginate');
const config = require('../../config');
const { findOrFail } = require('../../utils/binding');
const { HttpError } = require('../../utils/errors');

const pad4 = (n) => String(n).padStart(4, '0');
const randInt = (min, max) => crypto.randomInt(min, max + 1);
const randomString = (n) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i += 1) s += chars[crypto.randomInt(chars.length)];
  return s;
};

// `with('referrals.referredUser:id,name,phone,role_id')`
const referralsInclude = () => [{
  model: Referral,
  as: 'referrals',
  required: false,
  include: [{ model: User, as: 'referredUser', attributes: ['id', 'name', 'phone', 'role_id'], required: false }],
}];

// $referrals->map(...)->filter()->values()  (items are arrays, never falsy)
const mapReferral = (ref) => {
  const u = ref.referredUser;
  return {
    id: u ? u.id : null,
    name: u ? u.name : null,
    phone: u ? u.phone : null,
    role_id: u ? u.role_id : null,
    points: ref.points,
    created_at: ref.created_at,
  };
};

module.exports = {
  async myReferralLink(req, res) {
    const user = req.user;

    if (!user.referral_code) {
      // $user->loadMissing('role')
      let roleSlug;
      if (user.role && user.role.slug) {
        roleSlug = user.role.slug;
      } else {
        roleSlug = 'user';
      }
      const prefix = roleSlug.substring(0, 1).toUpperCase();

      user.referral_code = `HOBIT-${prefix}-${pad4(randInt(0, 9999))}`;
      await user.save();
    }

    const baseUrl = String(config.frontendUrl ?? '').replace(/\/+$/, ''); // config('app.frontend_url') key exists (null when unset): default never used

    return res.json({
      referral_code: user.referral_code,
      referral_link: `${baseUrl}/login?ref=${user.referral_code}`,
      worker_referral_link: `${baseUrl}/worker/login?ref=${user.referral_code}`,
    });
  },

  /** Users who have earned referral points, plus the users they have referred (workers + customers). */
  async get_all_refrals(req, res) {
    const users = await paginate(User, req, {
      where: { referral_points: { [Op.gt]: 0 } },
      include: referralsInclude(),
      order: [['created_at', 'DESC']],
      perPage: 20,
    });

    // Eloquent serialises the `referredUser` relation as `referred_user`
    const usersJson = JSON.parse(JSON.stringify(users));
    for (const u of usersJson.data || []) {
      for (const r of u.referrals || []) {
        if ('referredUser' in r) { r.referred_user = r.referredUser; delete r.referredUser; }
      }
    }

    return res.json({
      message: 'Users with referral points and their referrals fetched successfully',
      users: usersJson,
    });
  },

  /**
   * List contractors/agents who can refer (for dropdown in worker registration)
   * Returns contractors and agents with id, name, phone, referral_code, role
   */
  async referrersDropdown(req, res) {
    const roles = (await Role.findAll({ where: { slug: ['contractors', 'agents'] }, attributes: ['id'] })).map((r) => r.id);
    if (!roles.length) {
      return res.json({ success: true, data: [] });
    }

    const users = await User.findAll({
      where: { role_id: roles, is_active: 1 },
      include: [{ model: Role, as: 'role', attributes: ['id', 'slug', 'name'], required: false }],
      attributes: ['id', 'name', 'firm', 'phone', 'referral_code', 'role_id'],
      order: [['name', 'ASC']],
    });

    const data = [];
    for (const user of users) {
      if (!user.referral_code) {
        const prefix = user.role && user.role.slug ? user.role.slug.substring(0, 1).toUpperCase() : 'C';
        user.referral_code = `HOBIT-${prefix}-${pad4(Number(user.id) % 10000)}`;
        await user.save({ hooks: false, }); // saveQuietly()
      }
      data.push({
        id: user.id,
        name: user.name,
        firm: user.firm,
        phone: user.phone,
        role: user.role ? user.role.slug : null,
        referral_code: user.referral_code,
      });
    }

    return res.json({
      success: true,
      data,
    });
  },

  /** Get workers referred by a specific user (referrer) */
  async referredWorkers(req, res) {
    const user = await findOrFail(User, req.params.user);

    const referrals = await Referral.findAll({
      where: { referrer_id: user.id, referred_user_type: 'workers' },
      include: [{
        model: User,
        as: 'referredUser',
        attributes: ['id', 'name', 'phone', 'public_id', 'created_at'],
        required: false,
      }],
      order: [['created_at', 'DESC']],
    });

    const data = referrals
      .map((ref) => {
        const u = ref.referredUser;
        return u ? {
          id: u.id,
          name: u.name,
          phone: u.phone,
          public_id: u.public_id,
          points: ref.points,
          referred_at: ref.created_at,
        } : null;
      })
      .filter((x) => x);

    return res.json({
      success: true,
      referrer: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        referral_code: user.referral_code,
      },
      referred_workers: data,
    });
  },

  /**
   * Public "refer and earn" registration
   *
   * Fields:
   * - number (required): phone number
   * - name   (required): full name
   * - refer  (optional): referral code of existing user
   */
  async referAndEarn(req, res) {
    const data = await validate(req, {
      number: 'required|string|max:15',
      name: 'required|string|max:150',
      refer: 'nullable|string|max:50',
    });

    const result = await sequelize.transaction(async (t) => {
      // Resolve customer role (support different slug conventions, but don't fail hard)
      const customerRole = await Role.findOne({ where: { slug: ['customer', 'customers'] }, transaction: t });

      // Create or update basic user profile for this phone
      const [user, created] = await User.findOrCreate({
        where: { phone: data.number },
        defaults: {
          name: data.name,
          password: hash.make(randomString(12)),
          role_id: customerRole ? customerRole.id : null,
          is_active: true,
        },
        transaction: t,
      });

      // Always keep the latest provided name
      if (created === false && user.name !== data.name) {
        await user.update({ name: data.name }, { transaction: t });
      }

      let referrer = null;

      if (data.refer) {
        referrer = await User.findOne({ where: { referral_code: data.refer }, transaction: t });

        if (!referrer) {
          return { status: 422, body: { success: false, message: 'Invalid referral code' } };
        }

        // Prevent self referral
        if (referrer.phone !== user.phone) {
          const referrerRole = referrer.role_id ? await Role.findByPk(referrer.role_id, { transaction: t }) : null;

          // Map to allowed enum values for *_type columns
          const allowedTypes = ['workers', 'customers', 'contractors'];
          const referrerType = referrerRole && allowedTypes.includes(referrerRole.slug)
            ? referrerRole.slug
            : 'customers';

          await user.update({
            referred_by: referrer.id,
            referred_by_type: referrerType,
          }, { transaction: t });

          const points = parseInt(await Setting.get('referral_points_per_referral', 10), 10) || 0;

          await referrer.increment('referral_points', { by: points, transaction: t });

          await Referral.create({
            referrer_id: referrer.id,
            referrer_type: referrerType,
            referred_user_id: user.id,
            referred_user_type: 'customers',
            points,
          }, { transaction: t });
        }
      }

      return {
        status: 201,
        body: {
          success: true,
          message: 'Referral registration saved successfully',
          data: {
            user_id: user.id,
            name: user.name,
            number: user.phone,
            referred: referrer ? {
              id: referrer.id,
              name: referrer.name,
              code: referrer.referral_code,
            } : null,
          },
        },
      };
    });

    return res.status(result.status).json(result.body);
  },

  /**
   * Logged-in user's referral earnings (customers, workers, etc.).
   * Returns total referral_points and referred users with points.
   */
  async myReferralEarnings(req, res) {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated',
      });
    }

    const refs = await Referral.findAll({
      where: { referrer_id: user.id },
      include: [{ model: User, as: 'referredUser', attributes: ['id', 'name', 'phone', 'role_id'], required: false }],
    });

    const referrals = refs.map(mapReferral);

    return res.json({
      success: true,
      referral_points: parseInt(user.referral_points, 10) || 0,
      referrals_count: referrals.length,
      referrals,
    });
  },

  /**
   * Redeem (use) referral points - deducts from the authenticated user's balance.
   * POST /referral/redeem   Body: { "points": 5 }
   */
  async redeemPoints(req, res) {
    const data = await validate(req, {
      points: 'required|integer|min:1',
    });
    const points = parseInt(data.points, 10);

    const user = req.user;

    if ((parseInt(user.referral_points, 10) || 0) < points) {
      return res.status(422).json({
        success: false,
        message: 'Insufficient referral points',
        available_points: parseInt(user.referral_points, 10) || 0,
      });
    }

    await user.decrement('referral_points', { by: points });
    await user.reload({ attributes: ['id', 'referral_points'] });

    return res.json({
      success: true,
      message: 'Points redeemed successfully',
      points_used: data.points,
      remaining_points: parseInt(user.referral_points, 10) || 0,
    });
  },

};
