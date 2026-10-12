module.exports = (sequelize, DataTypes) => {
  const HowWork = sequelize.define('HowWork', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    step: { type: DataTypes.INTEGER },
    title: { type: DataTypes.STRING },
    subtitle: { type: DataTypes.STRING(500) },
    image: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'how_works',
  });
  return HowWork;
};
