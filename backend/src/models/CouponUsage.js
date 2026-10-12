const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const CouponUsage = sequelize.define('CouponUsage', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    coupon_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, { tableName: 'coupon_usages' });

  addFillable(CouponUsage, ['coupon_id', 'user_id', 'booking_id', 'discount_amount']);

  CouponUsage.associate = (models) => {
    CouponUsage.belongsTo(models.Coupon, { foreignKey: 'coupon_id', as: 'coupon' });
    CouponUsage.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    CouponUsage.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  };
  return CouponUsage;
};
