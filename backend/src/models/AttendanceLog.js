module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const AttendanceLog = sequelize.define('AttendanceLog', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    worker_id: { type: U, allowNull: false },
    zone_id: { type: U, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false }, // cast date (unique per worker per day)
    check_in_at: { type: DataTypes.DATE, allowNull: true },
    check_in_lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    check_in_lon: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    check_in_distance_m: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    check_in_photo: { type: DataTypes.STRING, allowNull: true },
    check_out_at: { type: DataTypes.DATE, allowNull: true },
    check_out_lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    check_out_lon: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    check_out_distance_m: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  }, { tableName: 'attendance_logs' });

  AttendanceLog.associate = (models) => {
    AttendanceLog.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker' });
    AttendanceLog.belongsTo(models.Zone, { foreignKey: 'zone_id', as: 'zone' });
  };
  return AttendanceLog;
};
