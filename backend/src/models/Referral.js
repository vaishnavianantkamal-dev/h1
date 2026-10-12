module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const types = ['workers', 'customers', 'contractors'];
  const Referral = sequelize.define('Referral', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    referrer_id: { type: U, allowNull: false },
    referrer_type: { type: DataTypes.ENUM(...types), allowNull: false },
    referred_user_id: { type: U, allowNull: false },
    referred_user_type: { type: DataTypes.ENUM(...types), allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
  }, { tableName: 'referrals' });

  Referral.associate = (models) => {
    Referral.belongsTo(models.User, { foreignKey: 'referrer_id', as: 'referrer', constraints: false });
    Referral.belongsTo(models.User, { foreignKey: 'referred_user_id', as: 'referredUser', constraints: false });
  };
  return Referral;
};
