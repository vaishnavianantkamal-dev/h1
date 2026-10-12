module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const ServiceableArea = sequelize.define('ServiceableArea', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    zone_id: { type: U, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    pincode: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'serviceable_areas' });

  ServiceableArea.associate = (models) => {
    ServiceableArea.belongsTo(models.Zone, { foreignKey: 'zone_id', as: 'zone' });
  };
  return ServiceableArea;
};
