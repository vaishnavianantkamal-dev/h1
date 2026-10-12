module.exports = (sequelize, DataTypes) => {
  const Hero = sequelize.define('Hero', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    button_primary_text: { type: DataTypes.STRING },
    button_primary_link: { type: DataTypes.STRING },
    button_secondary_text: { type: DataTypes.STRING },
    button_secondary_link: { type: DataTypes.STRING },
    hero_image: { type: DataTypes.STRING },
    available_in: { type: DataTypes.JSON },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'heroes',
  });
  return Hero;
};
