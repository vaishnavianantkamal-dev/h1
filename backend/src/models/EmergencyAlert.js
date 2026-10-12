// Laravel 'float' cast: DECIMAL comes back as a number (decimalNumbers) but be explicit; null stays null.
const floatCast = (field) => ({
  get() {
    const v = this.getDataValue(field);
    return v === null || v === undefined ? v : parseFloat(v);
  },
});

module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const EmergencyAlert = sequelize.define('EmergencyAlert', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    booking_id: { type: U, allowNull: true },
    worker_id: { type: U, allowNull: false },
    customer_id: { type: U, allowNull: true },
    city_id: { type: U, allowNull: true },
    alert_type: { type: DataTypes.ENUM('safety', 'medical', 'accident', 'harassment', 'other'), allowNull: false, defaultValue: 'safety' },
    message: { type: DataTypes.TEXT, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, ...floatCast('latitude') },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true, ...floatCast('longitude') },
    status: { type: DataTypes.ENUM('pending', 'acknowledged', 'resolved'), allowNull: false, defaultValue: 'pending' },
    handled_by: { type: U, allowNull: true },
    handled_note: { type: DataTypes.TEXT, allowNull: true },
    handled_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'emergency_alerts' });

  EmergencyAlert.associate = (models) => {
    EmergencyAlert.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    EmergencyAlert.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker' });
    EmergencyAlert.belongsTo(models.User, { foreignKey: 'handled_by', as: 'handledBy', constraints: false });
  };
  return EmergencyAlert;
};
