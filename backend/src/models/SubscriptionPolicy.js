module.exports = (sequelize, DataTypes) => {
  const SubscriptionPolicy = sequelize.define('SubscriptionPolicy', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    service_type: { type: DataTypes.STRING(50) },
    heading: { type: DataTypes.STRING },
    group_title: { type: DataTypes.STRING },
    group_order: { type: DataTypes.INTEGER.UNSIGNED },
    point_text: { type: DataTypes.TEXT },
    point_order: { type: DataTypes.INTEGER.UNSIGNED },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'subscription_policies',
  });
  return SubscriptionPolicy;
};
