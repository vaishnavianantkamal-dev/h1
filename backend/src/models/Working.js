module.exports = (sequelize, DataTypes) => {
  const Working = sequelize.define('Working', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    card_title: { type: DataTypes.STRING },
    card_subtitle: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'workings',
  });
  return Working;
};
