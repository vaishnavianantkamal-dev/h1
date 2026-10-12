module.exports = (sequelize, DataTypes) => {
  const EarnBanner = sequelize.define('EarnBanner', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING },
    amount: { type: DataTypes.DECIMAL(10, 2), get() { const v = this.getDataValue('amount'); return v === null || v === undefined ? v : Number(v).toFixed(2); } },
    currency_symbol: { type: DataTypes.STRING(8) },
    subtitle: { type: DataTypes.STRING },
    icon: { type: DataTypes.STRING },
    action_url: { type: DataTypes.STRING },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'earn_banners',
  });
  return EarnBanner;
};
