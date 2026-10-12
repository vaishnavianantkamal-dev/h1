module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const CommissionCalculate = sequelize.define('CommissionCalculate', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    booking_id: { type: U, allowNull: false },
    service_id: { type: U, allowNull: false },
    worker_id: { type: U, allowNull: false },
    booking_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    company_commission: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    worker_earning: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    commission_type: { type: DataTypes.STRING, allowNull: false }, // fixed | percentage
    commission_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, { tableName: 'commissions' });

  CommissionCalculate.associate = (models) => {
    CommissionCalculate.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    CommissionCalculate.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker' });
    CommissionCalculate.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
  };
  return CommissionCalculate;
};
