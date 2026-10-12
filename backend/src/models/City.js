module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const City = sequelize.define('City', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'cities' });

  // city_service pivot (composite PK city_id + service_id, no timestamps)
  const CityService = sequelize.define('CityService', {
    city_id: { type: U, primaryKey: true, allowNull: false },
    service_id: { type: U, primaryKey: true, allowNull: false },
  }, { tableName: 'city_service', timestamps: false });

  City.associate = (models) => {
    City.hasMany(models.Zone, { foreignKey: 'city_id', as: 'zones' });
    City.belongsToMany(models.Service, { through: CityService, foreignKey: 'city_id', otherKey: 'service_id', as: 'services' });
  };
  return City;
};
