const { flagField, addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const ServiceCategory = sequelize.define('ServiceCategory', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    icon: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: flagField(DataTypes, 'status', 1), // no cast in PHP (0/1)
  }, { tableName: 'service_categories' });

  addFillable(ServiceCategory, ['name', 'slug', 'icon', 'description', 'status']);

  ServiceCategory.associate = (models) => {
    ServiceCategory.hasMany(models.Service, { foreignKey: 'category_id', as: 'services' });
    ServiceCategory.belongsToMany(models.SubscriptionType, {
      through: 'category_subscription',
      foreignKey: 'category_id',
      otherKey: 'subscription_id',
      as: 'subscriptions',
      timestamps: true, // withTimestamps()
    });
  };
  return ServiceCategory;
};
