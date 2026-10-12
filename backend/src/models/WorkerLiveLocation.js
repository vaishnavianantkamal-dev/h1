module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  return sequelize.define('WorkerLiveLocation', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    booking_id: { type: U, allowNull: false },
    worker_id: { type: U, allowNull: false },
    live_location_url: { type: DataTypes.TEXT, allowNull: false },
  }, { tableName: 'worker_live_locations' });
};
