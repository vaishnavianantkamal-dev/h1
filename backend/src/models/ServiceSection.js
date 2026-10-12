module.exports = (sequelize, DataTypes) => {
  const ServiceSection = sequelize.define('ServiceSection', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'service_sections',
  });
  return ServiceSection;
};
