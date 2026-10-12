// Laravel Sanctum's personal_access_tokens table - shared so tokens issued by the old PHP app keep working.
module.exports = (sequelize, DataTypes) =>
  sequelize.define('PersonalAccessToken', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    tokenable_type: DataTypes.STRING,
    tokenable_id: DataTypes.BIGINT.UNSIGNED,
    name: DataTypes.TEXT,
    token: DataTypes.STRING(64),
    abilities: DataTypes.TEXT,
    last_used_at: DataTypes.DATE,
    expires_at: DataTypes.DATE,
  }, { tableName: 'personal_access_tokens' });
