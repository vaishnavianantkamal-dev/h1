const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const SubscriptionType = sequelize.define('SubscriptionType', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
  }, { tableName: 'subscription_type' });

  addFillable(SubscriptionType, ['name']);

  SubscriptionType.associate = (models) => {
    SubscriptionType.hasMany(models.Service, { foreignKey: 'subscription_id', as: 'services' });
    SubscriptionType.belongsToMany(models.ServiceCategory, {
      through: 'category_subscription',
      foreignKey: 'subscription_id',
      otherKey: 'category_id',
      as: 'categories',
      timestamps: true, // withTimestamps()
    });
  };
  return SubscriptionType;
};
