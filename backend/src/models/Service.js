const { jsonField, flagField, addFillable } = require('./concerns/casts');
const applyResolvablePrice = require('./concerns/HasResolvablePrice');

module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    images: jsonField(DataTypes, 'images'), // cast array (json column)
    icons: jsonField(DataTypes, 'icons'),   // cast array (longText column)
    duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    festival_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    member_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    subscription_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    status: flagField(DataTypes, 'status', 1), // no cast in PHP (0/1)
    // Columns present in the live DB / validated in controllers (no migration in repo)
    service_type: { type: DataTypes.STRING, allowNull: true },
    bhk_type: { type: DataTypes.STRING, allowNull: true },
    service_group: { type: DataTypes.STRING(100), allowNull: true },
    size_type: { type: DataTypes.STRING(50), allowNull: true },
    size_value: { type: DataTypes.STRING(100), allowNull: true },
  }, { tableName: 'services' });

  applyResolvablePrice(Service); // trait HasResolvablePrice: resolvedPrice(), pricePayload()

  addFillable(Service, [
    'category_id', 'name', 'description', 'images', 'icons', 'duration_minutes', 'price', 'festival_price',
    'member_price', 'subscription_id', 'status', 'service_type', 'bhk_type', 'service_group', 'size_type', 'size_value',
  ]);

  Service.associate = (models) => {
    Service.belongsTo(models.ServiceCategory, { foreignKey: 'category_id', as: 'category' });
    Service.belongsTo(models.SubscriptionType, { foreignKey: 'subscription_id', as: 'subscription' });
    Service.belongsToMany(models.SubscriptionType, {
      through: 'service_subscription',
      foreignKey: 'service_id',
      otherKey: 'subscription_id',
      as: 'subscriptions',
      timestamps: true, // withTimestamps()
    });
    // Period billing plans for this service (15 Days / 1 Month ...)
    Service.hasMany(models.ServicePlan, { foreignKey: 'service_id', as: 'plans' });
    Service.hasMany(models.ExtraTimeFee, { foreignKey: 'service_id', as: 'extraTimeFees' });
    // PHP orders this relation by sort_order, id. Sequelize associations can't carry an order:
    // callers should add  order: [[{ model: models.ServiceDoDont, as: 'dosDonts' }, 'sort_order', 'ASC'], [..., 'id', 'ASC']]
    Service.hasMany(models.ServiceDoDont, { foreignKey: 'service_id', as: 'dosDonts' });
    Service.belongsToMany(models.City, {
      through: 'city_service',
      foreignKey: 'service_id',
      otherKey: 'city_id',
      as: 'cities',
      timestamps: false, // pivot has no timestamps / id
    });
  };

  return Service;
};
