// Port of App\Http\Controllers\Coupon\CouponController
const { Op, literal } = require('sequelize');
const { Coupon, CouponUsage, User } = require('../../models');
const paginate = require('../../utils/paginate');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const { validateEx, afterOrEqual, pick, toJSON, castDateTime, inMemory } = require('./../catalog/support');

const FILLABLE = [
  'name', 'code', 'description', 'type', 'value', 'max_discount', 'min_order_amount', 'usage_limit', 'used_count',
  'per_user_limit', 'audience', 'status', 'starts_at', 'expires_at',
];

// withCount('usages')
const usagesCount = [
  literal('(SELECT COUNT(*) FROM `coupon_usages` WHERE `coupon_usages`.`coupon_id` = `Coupon`.`id`)'),
  'usages_count',
];

// ---- Coupon model helpers (port of Coupon::validate / calculateDiscount) -------------------------------------
function calculateDiscount(coupon, orderAmount) {
  if (coupon.type === 'fixed') return Math.min(parseFloat(coupon.value), orderAmount);

  // Percentage
  let discount = (orderAmount * parseFloat(coupon.value)) / 100;
  if (coupon.max_discount && parseFloat(coupon.max_discount)) {
    discount = Math.min(discount, parseFloat(coupon.max_discount));
  }
  return Math.round(discount * 100) / 100;
}

const inr = (n) => '₹' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function validateCouponFor(coupon, userId, orderAmount) {
  const now = dayjs();

  if (!coupon.status) return { valid: false, message: 'Coupon is inactive.' };
  if (coupon.starts_at && now.isBefore(dayjs(coupon.starts_at))) return { valid: false, message: 'Coupon is not active yet.' };
  if (coupon.expires_at && now.isAfter(dayjs(coupon.expires_at))) return { valid: false, message: 'Coupon has expired.' };
  if (Number(coupon.used_count) >= Number(coupon.usage_limit)) return { valid: false, message: 'Coupon usage limit reached.' };

  if (coupon.audience === 'member' || coupon.audience === 'new_user') {
    const user = await User.findByPk(userId);
    if (coupon.audience === 'member' && (!user || !(await user.isMember()))) {
      return { valid: false, message: 'This coupon is only valid for members.' };
    }
    if (coupon.audience === 'new_user' && (!user || !(await user.isNewUser()))) {
      return { valid: false, message: 'This coupon is only valid for new users.' };
    }
  }

  if (orderAmount < parseFloat(coupon.min_order_amount ?? 0)) {
    return { valid: false, message: 'Minimum order amount of ' + inr(coupon.min_order_amount) + ' required.' };
  }

  const userUsageCount = await CouponUsage.count({ where: { coupon_id: coupon.id, user_id: userId } });
  if (userUsageCount >= Number(coupon.per_user_limit)) return { valid: false, message: 'You have already used this coupon.' };

  const discount = calculateDiscount(coupon, orderAmount);
  return {
    valid: true,
    message: 'Coupon applied successfully.',
    discount,
    final_amount: Math.max(0, orderAmount - discount),
  };
}

const validDate = (v) => v === null || v === undefined || v === '' || !Number.isNaN(Date.parse(v));

const dateExtra = async (data) => {
  const errors = {};
  if (validDate(data.starts_at)) afterOrEqual(data, 'expires_at', 'starts_at', errors);
  return errors;
};

module.exports = {
  async index(req, res) {
    const where = {};
    const and = [];
    if (req.filled('status')) where.status = req.boolean('status');

    if (req.filled('search')) {
      const like = `%${req.input('search')}%`;
      and.push({ [Op.or]: [{ code: { [Op.like]: like } }, { name: { [Op.like]: like } }] });
    }
    if (and.length) where[Op.and] = and;

    const data = await paginate(Coupon, req, {
      where,
      attributes: { include: [usagesCount] },
      order: [['created_at', 'DESC']], // latest()
      perPage: 20,
    });

    res.json({ success: true, data });
  },

  /** POST /api/coupons - create coupon (admin) */
  async store(req, res) {
    const validated = await validateEx(req, {
      name: 'required|string|max:100',
      code: 'required|string|max:50|unique:coupons,code',
      description: 'nullable|string',
      type: 'required|in:fixed,percentage',
      value: 'required|numeric|min:1',
      max_discount: 'nullable|numeric|min:1',
      min_order_amount: 'nullable|numeric|min:0',
      usage_limit: 'required|integer|min:1',
      per_user_limit: 'required|integer|min:1',
      audience: 'required|in:all,member,new_user',
      status: 'boolean',
      starts_at: 'nullable|date',
      expires_at: 'nullable|date',
    }, {}, dateExtra);

    // Percentage value cannot exceed 100
    if (validated.type === 'percentage' && Number(validated.value) > 100) {
      return res.status(422).json({ success: false, message: 'Percentage value cannot exceed 100.' });
    }

    validated.code = String(validated.code).toUpperCase();

    const assigned = pick(validated, FILLABLE);
    for (const k of ['starts_at', 'expires_at']) if (assigned[k] !== undefined) assigned[k] = castDateTime(assigned[k]);
    const coupon = await Coupon.create(assigned);

    res.status(201).json({ success: true, message: 'Coupon created successfully.', data: inMemory('Coupon', {}, assigned, coupon) });
  },

  /** GET /api/coupons/{coupon} - show single coupon (admin) */
  async show(req, res) {
    const found = await findOrFail(Coupon, req.params.coupon, { attributes: { include: [usagesCount] } });
    const usages = await CouponUsage.findAll({
      where: { coupon_id: found.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'], required: false }],
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    const data = toJSON(found);
    data.usages = usages.map(toJSON);

    res.json({ success: true, data });
  },

  /** PUT /api/coupons/{coupon} - update coupon (admin) */
  async update(req, res) {
    const coupon = await findOrFail(Coupon, req.params.coupon);
    const validated = await validateEx(req, {
      name: 'sometimes|string|max:100',
      code: 'sometimes|string|max:50|unique:coupons,code,' + coupon.id,
      description: 'nullable|string',
      type: 'sometimes|in:fixed,percentage',
      value: 'sometimes|numeric|min:1',
      max_discount: 'nullable|numeric|min:1',
      min_order_amount: 'nullable|numeric|min:0',
      usage_limit: 'sometimes|integer|min:1',
      per_user_limit: 'sometimes|integer|min:1',
      audience: 'sometimes|in:all,member,new_user',
      status: 'boolean',
      starts_at: 'nullable|date',
      expires_at: 'nullable|date',
    }, {}, dateExtra);

    if (validated.code !== undefined && validated.code !== null) validated.code = String(validated.code).toUpperCase();

    if (
      validated.type !== undefined && validated.type !== null
      && validated.value !== undefined && validated.value !== null
      && validated.type === 'percentage' && Number(validated.value) > 100
    ) {
      return res.status(422).json({ success: false, message: 'Percentage value cannot exceed 100.' });
    }

    const base = toJSON(coupon);
    const assigned = pick(validated, FILLABLE);
    for (const k of ['starts_at', 'expires_at']) if (assigned[k] !== undefined) assigned[k] = castDateTime(assigned[k]);
    await coupon.update(assigned);

    res.json({ success: true, message: 'Coupon updated successfully.', data: inMemory('Coupon', base, assigned, coupon) });
  },

  /** DELETE /api/coupons/{coupon} - soft delete coupon (admin) */
  async destroy(req, res) {
    const coupon = await findOrFail(Coupon, req.params.coupon);
    await coupon.destroy();
    res.json({ success: true, message: 'Coupon deleted successfully.' });
  },

  /** PATCH /api/coupons/{coupon}/toggle-status */
  async toggleStatus(req, res) {
    const coupon = await findOrFail(Coupon, req.params.coupon);
    await coupon.update({ status: !coupon.status });
    res.json({ success: true, message: 'Coupon status updated.', status: coupon.status });
  },

  // ── USER FACING ─────────────────────────────────────────────────────────────

  /** GET /api/user/coupons - list active coupons for user to browse */
  async activeCoupons(req, res) {
    const user = req.user;
    const userId = user.id;

    const isMember = await user.isMember();
    const isNewUser = await user.isNewUser();

    const all = await Coupon.scope('active').findAll();
    const coupons = all.filter((coupon) => {
      if (coupon.audience === 'member') return isMember;
      if (coupon.audience === 'new_user') return isNewUser;
      return true;
    });

    const data = [];
    for (const coupon of coupons) {
      const userUsed = await CouponUsage.count({ where: { coupon_id: coupon.id, user_id: userId } });
      const cj = toJSON(coupon);
      data.push({
        id: coupon.id,
        name: coupon.name,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: cj.value,
        max_discount: cj.max_discount,
        min_order_amount: cj.min_order_amount,
        expires_at: cj.expires_at,
        audience: coupon.audience,
        already_used: userUsed >= Number(coupon.per_user_limit),
      });
    }

    res.json({ success: true, data });
  },

  /**
   * POST /api/user/coupons/validate
   * Body: { coupon_code, booking_amount, booking_id (optional) }
   */
  async validateCoupon(req, res) {
    await validateEx(req, {
      coupon_code: 'required|string',
      booking_amount: 'required|numeric|min:1',
    });

    const user = req.user;
    const code = String(req.input('coupon_code')).trim().toUpperCase();
    const amount = parseFloat(req.input('booking_amount')) || 0;

    const coupon = await Coupon.findOne({ where: { code } });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code.' });
    }

    const result = await validateCouponFor(coupon, user.id, amount);

    if (!result.valid) {
      return res.status(422).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: result.message,
      coupon_id: coupon.id,
      coupon_code: coupon.code,
      coupon_name: coupon.name,
      type: coupon.type,
      value: toJSON(coupon).value,
      discount_amount: result.discount,
      original_amount: amount,
      final_amount: result.final_amount,
    });
  },
};
