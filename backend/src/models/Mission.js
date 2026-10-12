module.exports = (sequelize, DataTypes) => {
  const Mission = sequelize.define('Mission', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    image: { type: DataTypes.STRING },
    badge_title: { type: DataTypes.STRING },
    badge_subtitle: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'missions',
  });
  return Mission;
};
