const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BlockedSlot = sequelize.define('BlockedSlot', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    blocked_date: { type: DataTypes.DATEONLY, allowNull: true }, // cast date:Y-m-d (nullable since 2026_06_22)
    time_slot_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    reason: { type: DataTypes.STRING, allowNull: true },
    blocked_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, { tableName: 'blocked_slots' });

  addFillable(BlockedSlot, ['blocked_date', 'time_slot_id', 'category_id', 'reason', 'blocked_by']);

  BlockedSlot.associate = (models) => {
    BlockedSlot.belongsTo(models.TimeSlot, { foreignKey: 'time_slot_id', as: 'timeSlot' });
    BlockedSlot.belongsTo(models.ServiceCategory, { foreignKey: 'category_id', as: 'category' });
    BlockedSlot.belongsTo(models.User, { foreignKey: 'blocked_by', as: 'blockedByUser' });
  };
  return BlockedSlot;
};
