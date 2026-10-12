// Durable job queue table for the Node app (replaces Laravel's `jobs` table whose payloads are PHP-serialized).
module.exports = (sequelize, DataTypes) =>
  sequelize.define('NodeJob', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    payload: { type: DataTypes.JSON },
    run_at: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' }, // pending | running | done | failed
    attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    last_error: DataTypes.TEXT,
  }, { tableName: 'node_jobs', indexes: [{ fields: ['status', 'run_at'] }] });
