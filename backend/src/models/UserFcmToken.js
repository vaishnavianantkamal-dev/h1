module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  return sequelize.define('UserFcmToken', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    user_id: { type: U, allowNull: false },
    fcm_token: { type: DataTypes.STRING, allowNull: false, unique: true },
    device_name: { type: DataTypes.STRING, allowNull: true },
    last_used_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'user_fcm_tokens' });
};
