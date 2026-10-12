// A single live-tracking trip for a booking (Firebase RTDB based).
module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const TrackingSession = sequelize.define('TrackingSession', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    booking_id: { type: U, allowNull: false },
    worker_id: { type: U, allowNull: false }, // users.id of the worker
    token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ended_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'tracking_sessions' });

  TrackingSession.associate = (models) => {
    TrackingSession.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking', constraints: false });
    TrackingSession.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker', constraints: false });
  };
  return TrackingSession;
};
