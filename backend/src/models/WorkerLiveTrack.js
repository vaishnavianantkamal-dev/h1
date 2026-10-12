module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  return sequelize.define('WorkerLiveTrack', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    booking_id: { type: U, allowNull: false, unique: true },
    latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    whatsapp_sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    last_ping_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'worker_live_tracks' });
};
