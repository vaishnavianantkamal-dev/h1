module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const WorkerAvailability = sequelize.define('WorkerAvailability', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    worker_id: { type: U, allowNull: false }, // users.id of the worker
    available_dates: { type: DataTypes.JSON, allowNull: false },
    available_times: { type: DataTypes.JSON, allowNull: false },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'worker_availabilities' });

  WorkerAvailability.associate = (models) => {
    WorkerAvailability.belongsTo(models.Worker, { foreignKey: 'worker_id', as: 'worker', constraints: false });
  };

  // Is worker available on given date & time?
  WorkerAvailability.prototype.isAvailable = function isAvailable(date, startTime, endTime) {
    if (!this.status) return false;
    if (!(this.available_dates || []).includes(date)) return false;
    for (const slot of this.available_times || []) {
      if (slot.start <= startTime && slot.end >= endTime) return true;
    }
    return false;
  };

  return WorkerAvailability;
};
