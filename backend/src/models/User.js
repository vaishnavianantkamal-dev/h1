const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const User = sequelize.define('User', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    role_id: { type: U, allowNull: true },
    public_id: { type: DataTypes.STRING, allowNull: true, unique: true },
    added_by: { type: U, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: true },
    gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: false, unique: true },
    fcm_token: { type: DataTypes.STRING, allowNull: true },
    emergency_contact: { type: DataTypes.STRING, allowNull: true },
    otp: { type: DataTypes.STRING, allowNull: true },
    otp_expires_at: { type: DataTypes.DATE, allowNull: true },
    is_phone_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    email: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    refer_by: { type: DataTypes.STRING, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_assigned: { type: DataTypes.BOOLEAN, allowNull: true },
    category_ids: { type: DataTypes.JSON, allowNull: true },
    service_ids: { type: DataTypes.JSON, allowNull: true },
    city_id: { type: U, allowNull: true },
    zone_id: { type: U, allowNull: true },
    area_id: { type: U, allowNull: true },
    referral_code: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    referred_by: { type: U, allowNull: true },
    referred_by_type: { type: DataTypes.ENUM('workers', 'customers', 'contractors'), allowNull: true },
    referral_points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    images: { type: DataTypes.JSON, allowNull: true },
    // In PHP $fillable but not created by any migration in this repo (assumed present in the shared DB):
    date_of_joining: { type: DataTypes.DATEONLY, allowNull: true },
    monthly_salary: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    firm: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'users',
    paranoid: true,
    deletedAt: 'deleted_at',
    hooks: {
      // static::creating
      beforeCreate: async (user) => {
        if (!user.public_id && user.role_id) {
          const role = await sequelize.models.Role.findByPk(user.role_id);
          if (role) {
            const RoleIdGenerator = require('../helpers/RoleIdGenerator');
            user.public_id = await RoleIdGenerator.generate(role.slug);
          }
        }
      },
      // static::saved - wasRecentlyCreated || wasChanged(['is_active','role_id','city_id'])
      afterCreate: async () => {
        const CacheService = require('../services/CacheService');
        await CacheService.forgetDashboardCounts();
      },
      afterUpdate: async (user) => {
        const changed = ['is_active', 'role_id', 'city_id'].some((f) => user.changed(f));
        if (changed) {
          const CacheService = require('../services/CacheService');
          await CacheService.forgetDashboardCounts();
        }
      },
      // static::deleted
      afterDestroy: async () => {
        const CacheService = require('../services/CacheService');
        await CacheService.forgetDashboardCounts();
      },
    },
  });

  // $hidden = ['password']
  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get({ plain: true }) };
    delete values.password;
    return values;
  };

  User.associate = (models) => {
    User.belongsTo(models.User, { foreignKey: 'refer_by', as: 'referredBy', constraints: false });
    User.hasOne(models.Worker, { foreignKey: 'user_id', as: 'worker' });
    User.hasOne(models.Customer, { foreignKey: 'user_id', as: 'customer' });
    // NOTE: PHP category()/service() use users.category_id/service_id, which were dropped by migration
    // 2026_01_27_051354; intentionally not declared (columns do not exist).
    User.belongsTo(models.City, { foreignKey: 'city_id', as: 'city' });
    User.belongsTo(models.Zone, { foreignKey: 'zone_id', as: 'zone' });
    User.belongsTo(models.ServiceableArea, { foreignKey: 'area_id', as: 'area' });
    User.hasMany(models.AttendanceLog, { foreignKey: 'worker_id', as: 'attendanceLogs' });
    User.hasMany(models.WorkerAvailability, { foreignKey: 'worker_id', as: 'worker_availablillity' });
    User.hasMany(models.WorkerAvailability, { foreignKey: 'worker_id', as: 'worker_availability' });
    User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    User.hasMany(models.Booking, { foreignKey: 'worker_id', as: 'bookings', constraints: false });
    User.hasMany(models.Booking, { foreignKey: 'customer_id', as: 'customerBookings', constraints: false });
    User.belongsTo(models.User, { foreignKey: 'added_by', as: 'addedBy', constraints: false });
    User.hasMany(models.User, { foreignKey: 'added_by', as: 'addedUsers', constraints: false });
    User.belongsTo(models.User, { foreignKey: 'referred_by', as: 'referrer', constraints: false });
    User.hasMany(models.Referral, { foreignKey: 'referrer_id', as: 'referrals' });
    User.hasMany(models.BookingRating, { foreignKey: 'worker_id', as: 'ratings', constraints: false });
    User.hasMany(models.CustomerAddress, { foreignKey: 'customer_id', sourceKey: 'id', as: 'addresses' });
    User.hasOne(models.CustomerAddress, { foreignKey: 'customer_id', sourceKey: 'id', as: 'defaultAddress', scope: { is_default: true } });
    User.hasMany(models.UserFcmToken, { foreignKey: 'user_id', as: 'fcmTokens' });
  };

  // needs role + role.permissions loaded (as req.user is)
  User.prototype.hasPermission = function hasPermission(permission) {
    return !!(this.role && (this.role.permissions || []).some((p) => p.slug === permission));
  };

  User.prototype.hasRole = function hasRole(slug) {
    return !!(this.role && this.role.slug === slug);
  };

  User.prototype.isAdmin = function isAdmin() {
    return this.hasRole('admin') || this.hasRole('super_admin');
  };

  const SUBSCRIPTION_TYPES = () => {
    const { BookingService } = sequelize.models;
    return (BookingService && BookingService.SUBSCRIPTION_TYPES) || ['Monthly Subscription', 'monthly'];
  };
  const PAID = () => (sequelize.models.Booking && sequelize.models.Booking.PAYMENT_PAID) || 'paid';

  // Member = paid, non-cancelled booking with an active monthly subscription line (end_date in the future).
  // Computed live. (Booking::scopeActiveMembership)
  User.prototype.isMember = async function isMember() {
    const { Booking, BookingService } = sequelize.models;
    const { today } = require('../utils/time');
    const found = await Booking.findOne({
      attributes: ['id'],
      where: { customer_id: this.id, payment_status: PAID(), status: { [Op.notIn]: ['cancelled'] } },
      include: [{
        model: BookingService, as: 'services', required: true, attributes: ['id'],
        where: { booking_type: { [Op.in]: SUBSCRIPTION_TYPES() }, end_date: { [Op.gte]: today() } },
      }],
    });
    return !!found;
  };

  // New user = never placed a booking of any kind (gates "new user" coupons).
  User.prototype.isNewUser = async function isNewUser() {
    const count = await sequelize.models.Booking.count({ where: { customer_id: this.id } });
    return count === 0;
  };

  // Furthest active subscription end_date for this customer, or null if not a member.
  User.prototype.membershipValidUntil = async function membershipValidUntil() {
    const { Booking, BookingService } = sequelize.models;
    const { today } = require('../utils/time');
    const max = await BookingService.max('end_date', {
      where: { booking_type: { [Op.in]: SUBSCRIPTION_TYPES() }, end_date: { [Op.gte]: today() } },
      include: [{
        model: Booking, as: 'booking', required: true, attributes: [],
        where: { customer_id: this.id, payment_status: PAID(), status: { [Op.notIn]: ['cancelled'] } },
      }],
    });
    return max == null ? null : max;
  };

  return User;
};
