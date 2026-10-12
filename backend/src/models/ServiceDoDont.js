const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const ServiceDoDont = sequelize.define('ServiceDoDont', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    service_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.STRING(10), allowNull: false }, // enum do|dont
    text: { type: DataTypes.STRING, allowNull: false },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  }, { tableName: 'service_dos_donts' });

  addFillable(ServiceDoDont, ['service_id', 'type', 'text', 'sort_order']);

  ServiceDoDont.associate = (models) => {
    ServiceDoDont.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
  };
  return ServiceDoDont;
};
