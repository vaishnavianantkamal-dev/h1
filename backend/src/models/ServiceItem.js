module.exports = (sequelize, DataTypes) => {
  const ServiceItem = sequelize.define('ServiceItem', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    slug: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    images: { type: DataTypes.JSON },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'service_items',
  });
  return ServiceItem;
};
