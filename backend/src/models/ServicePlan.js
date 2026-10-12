const { addFillable } = require('./concerns/casts');
const applyResolvablePrice = require('./concerns/HasResolvablePrice');

// A billing period of a service (e.g. "15 Days" / "1 Month") with its own price set.
module.exports = (sequelize, DataTypes) => {
  const ServicePlan = sequelize.define('ServicePlan', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    service_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    duration_days: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      get() { const v = this.getDataValue('duration_days'); return v === null || v === undefined ? v : parseInt(v, 10); },
    },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    festival_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    member_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  }, { tableName: 'service_plans' });

  applyResolvablePrice(ServicePlan);

  addFillable(ServicePlan, ['service_id', 'name', 'duration_days', 'price', 'festival_price', 'member_price']);

  ServicePlan.associate = (models) => {
    ServicePlan.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
  };
  return ServicePlan;
};
