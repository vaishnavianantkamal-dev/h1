module.exports = (sequelize, DataTypes) => {
  const Faq = sequelize.define('Faq', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    cards: { type: DataTypes.JSON },
    order: { type: DataTypes.INTEGER },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'faqs',
  });
  return Faq;
};
