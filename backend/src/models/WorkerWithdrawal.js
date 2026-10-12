module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const WorkerWithdrawal = sequelize.define('WorkerWithdrawal', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    worker_id: { type: U, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    approved_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'paid'), allowNull: false, defaultValue: 'pending' },
    request_note: { type: DataTypes.TEXT, allowNull: true },
    admin_note: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'worker_withdrawals' });

  WorkerWithdrawal.associate = (models) => {
    WorkerWithdrawal.belongsTo(models.Worker, { foreignKey: 'worker_id', as: 'worker' });
  };
  return WorkerWithdrawal;
};
