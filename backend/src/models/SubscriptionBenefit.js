module.exports = (sequelize, DataTypes) => {
  const SubscriptionBenefit = sequelize.define('SubscriptionBenefit', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    service_type: { type: DataTypes.STRING(50) },
    heading: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    icon: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER.UNSIGNED },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'subscription_benefits',
  });
  return SubscriptionBenefit;
};
