module.exports = (sequelize, DataTypes) => {
  // NOTE: `attempts` and `ip_address` are used by the PHP code/fillable but no migration in the repo adds them
  // (assumed present in the shared DB).
  return sequelize.define('OtpVerification', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    otp: { type: DataTypes.STRING, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    ip_address: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'otp_verifications' });
};
