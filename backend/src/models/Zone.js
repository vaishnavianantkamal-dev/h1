module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const Zone = sequelize.define('Zone', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    city_id: { type: U, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'zones' });

  Zone.associate = (models) => {
    Zone.belongsTo(models.City, { foreignKey: 'city_id', as: 'city' });
    Zone.hasMany(models.ServiceableArea, { foreignKey: 'zone_id', as: 'areas' });
  };
  return Zone;
};
