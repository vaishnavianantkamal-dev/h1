const { Op, literal } = require('sequelize');
const { dayjs } = require('../utils/time');
const { boolField, addFillable } = require('./concerns/casts');

const numberFormat2 = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define('Coupon', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.STRING(20), allowNull: false }, // enum fixed|percentage
    value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    max_discount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    min_order_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    usage_limit: { type: DataTypes.INTEGER, defaultValue: 1 },
    used_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    per_user_limit: { type: DataTypes.INTEGER, defaultValue: 1 },
    audience: { type: DataTypes.STRING(20), defaultValue: 'all' }, // enum all|member|new_user
    status: boolField(DataTypes, 'status', true),
    starts_at: { type: DataTypes.DATE, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'coupons',
    paranoid: true,
    deletedAt: 'deleted_at',
    scopes: {
      // scopeActive
      active: () => {
        const now = dayjs().toDate();
        return {
          where: {
            [Op.and]: [
              { status: true },
              { [Op.or]: [{ starts_at: null }, { starts_at: { [Op.lte]: now } }] },
              { [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gte]: now } }] },
              literal('`Coupon`.`used_count` < `Coupon`.`usage_limit`'),
            ],
          },
        };
      },
    },
  });

  addFillable(Coupon, [
    'name', 'code', 'description', 'type', 'value', 'max_discount', 'min_order_amount', 'usage_limit',
    'used_count', 'per_user_limit', 'audience', 'status', 'starts_at', 'expires_at',
  ]);

  Coupon.associate = (models) => {
    Coupon.hasMany(models.CouponUsage, { foreignKey: 'coupon_id', as: 'usages' });
  };

  // usagesByUser($userId): the PHP returns a query builder (used as ->count()/->get()). Here: rows (Promise).
  Coupon.prototype.usagesByUser = function usagesByUser(userId, options = {}) {
    return sequelize.models.CouponUsage.findAll({ where: { coupon_id: this.id, user_id: userId }, ...options });
  };
  Coupon.prototype.countUsagesByUser = function countUsagesByUser(userId, options = {}) {
    return sequelize.models.CouponUsage.count({ where: { coupon_id: this.id, user_id: userId }, ...options });
  };

  /**
   * Calculate discount amount
   */
  Coupon.prototype.calculateDiscount = function calculateDiscount(orderAmount) {
    orderAmount = Number(orderAmount);
    if (this.type === 'fixed') {
      return Math.min(Number(this.value), orderAmount);
    }

    // Percentage
    let discount = (orderAmount * Number(this.value)) / 100;

    if (Number(this.max_discount)) {
      discount = Math.min(discount, Number(this.max_discount));
    }

    return Math.round(discount * 100) / 100;
  };

  /**
   * Check if coupon is valid for a given user and amount (PHP Coupon::validate).
   * ASYNC. Returns { valid, message, discount?, final_amount? }.
   * NOTE: Sequelize instances already have a validate(options) method used by save(); this override
   * dispatches on arity - coupon.validate(userId, orderAmount) is the Coupon check, anything else
   * falls through to Sequelize's own validate. Also available as coupon.validateForUser(...).
   */
  Coupon.prototype.validateForUser = async function validateForUser(userId, orderAmount) {
    const { User } = sequelize.models;
    const now = dayjs();
    orderAmount = Number(orderAmount);

    if (!this.status) {
      return { valid: false, message: 'Coupon is inactive.' };
    }
    if (this.starts_at && now.isBefore(dayjs(this.starts_at))) {
      return { valid: false, message: 'Coupon is not active yet.' };
    }
    if (this.expires_at && now.isAfter(dayjs(this.expires_at))) {
      return { valid: false, message: 'Coupon has expired.' };
    }
    if (this.used_count >= this.usage_limit) {
      return { valid: false, message: 'Coupon usage limit reached.' };
    }

    if (this.audience === 'member' || this.audience === 'new_user') {
      const user = await User.findByPk(userId);

      if (this.audience === 'member' && (!user || !(await user.isMember()))) {
        return { valid: false, message: 'This coupon is only valid for members.' };
      }
      if (this.audience === 'new_user' && (!user || !(await user.isNewUser()))) {
        return { valid: false, message: 'This coupon is only valid for new users.' };
      }
    }

    if (orderAmount < Number(this.min_order_amount)) {
      return {
        valid: false,
        message: `Minimum order amount of ₹${numberFormat2(this.min_order_amount)} required.`,
      };
    }

    const userUsageCount = await this.countUsagesByUser(userId);
    if (userUsageCount >= this.per_user_limit) {
      return { valid: false, message: 'You have already used this coupon.' };
    }

    const discount = this.calculateDiscount(orderAmount);

    return {
      valid: true,
      message: 'Coupon applied successfully.',
      discount,
      final_amount: Math.max(0, orderAmount - discount),
    };
  };

  const sequelizeValidate = Coupon.prototype.validate;
  Coupon.prototype.validate = function validate(...args) {
    if (args.length >= 2) return this.validateForUser(args[0], args[1]);
    return sequelizeValidate.apply(this, args);
  };

  return Coupon;
};
