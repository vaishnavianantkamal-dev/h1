module.exports = (sequelize, DataTypes) => {
  const WhyChooseCard = sequelize.define('WhyChooseCard', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    service_type: { type: DataTypes.STRING(50) },
    heading: { type: DataTypes.STRING },
    subtitle: { type: DataTypes.STRING },
    section_icon: { type: DataTypes.STRING },
    card_title: { type: DataTypes.STRING },
    card_icon: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER.UNSIGNED },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'why_choose_cards',
  });
  return WhyChooseCard;
};
