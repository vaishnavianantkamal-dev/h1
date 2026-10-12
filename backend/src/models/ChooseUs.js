module.exports = (sequelize, DataTypes) => {
  const ChooseUs = sequelize.define('ChooseUs', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    heading: { type: DataTypes.STRING },
    image: { type: DataTypes.STRING },
    card_heading: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'choose_us',
  });
  return ChooseUs;
};
