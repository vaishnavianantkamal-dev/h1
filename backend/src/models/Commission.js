module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const Commission = sequelize.define('Commission', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    service_id: { type: U, allowNull: false },
    commission_type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false },
    value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
  }, { tableName: 'category_commissions' });

  Commission.associate = (models) => {
    Commission.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
  };

  Commission.prototype.calculate = function calculate(amount) {
    const value = Number(this.value);
    return this.commission_type === 'percentage'
      ? Math.round(((Number(amount) * value) / 100) * 100) / 100
      : value;
  };

  return Commission;
};
