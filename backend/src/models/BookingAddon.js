const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BookingAddon = sequelize.define('BookingAddon', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    addon_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, { tableName: 'booking_addons' });

  addFillable(BookingAddon, ['booking_id', 'addon_id', 'quantity', 'price', 'total']);

  BookingAddon.associate = (models) => {
    BookingAddon.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    BookingAddon.belongsTo(models.Addon, { foreignKey: 'addon_id', as: 'addon' });
  };
  return BookingAddon;
};
