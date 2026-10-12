const { boolField, addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const ID = { type: DataTypes.BIGINT.UNSIGNED };
  const BookingService = sequelize.define('BookingService', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { ...ID, allowNull: false },
    service_id: { ...ID, allowNull: false },
    service_plan_id: { ...ID, allowNull: true },
    addon_id: { ...ID, allowNull: true },
    is_addon: boolField(DataTypes, 'is_addon', false),
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    booking_type: { type: DataTypes.STRING, defaultValue: 'instant' },
    subscription_type_id: { ...ID, allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    unit_type: { type: DataTypes.STRING(50), allowNull: true },
    unit_value: { type: DataTypes.STRING(50), allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    completed_visits: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    last_completed_date: { type: DataTypes.DATEONLY, allowNull: true }, // cast 'date'
    expiry_reminder_sent_at: { type: DataTypes.DATE, allowNull: true },
    expiry_expired_notice_sent_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'booking_services' });

  // Booking types that represent a recurring (per-day) subscription.
  BookingService.SUBSCRIPTION_TYPES = ['Monthly Subscription', 'monthly'];

  addFillable(BookingService, [
    'booking_id', 'service_id', 'service_plan_id', 'addon_id', 'is_addon', 'quantity', 'booking_type',
    'subscription_type_id', 'start_date', 'end_date', 'unit_type', 'unit_value', 'price', 'total',
    'completed_visits', 'last_completed_date', 'expiry_reminder_sent_at', 'expiry_expired_notice_sent_at',
  ]);

  BookingService.associate = (models) => {
    BookingService.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    BookingService.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
    BookingService.belongsTo(models.SubscriptionType, { foreignKey: 'subscription_type_id', as: 'subscriptionType' });
    BookingService.belongsTo(models.ServicePlan, { foreignKey: 'service_plan_id', as: 'servicePlan' });
    BookingService.belongsTo(models.Addon, { foreignKey: 'addon_id', as: 'addon' });
  };

  return BookingService;
};
