module.exports = (sequelize, DataTypes) => {
  const SavingsPromoBanner = sequelize.define('SavingsPromoBanner', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING },
    subtitle: { type: DataTypes.STRING },
    images: { type: DataTypes.JSON },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'savings_promo_banners',
  });
  return SavingsPromoBanner;
};
