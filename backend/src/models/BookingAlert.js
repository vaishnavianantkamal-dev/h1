const { flagField, addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BookingAlert = sequelize.define('BookingAlert', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    message: { type: DataTypes.STRING, allowNull: false },
    is_read: flagField(DataTypes, 'is_read', 0), // no cast in PHP (0/1)
    alert_sent_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'booking_alerts' });

  addFillable(BookingAlert, ['booking_id', 'message', 'is_read', 'alert_sent_at']);

  BookingAlert.associate = (models) => {
    BookingAlert.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  };
  return BookingAlert;
};
