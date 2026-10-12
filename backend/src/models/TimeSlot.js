const { dayjs } = require('../utils/time');
const { boolField, addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const TimeSlot = sequelize.define('TimeSlot', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    slot_time: { type: DataTypes.TIME, allowNull: false, unique: true }, // 'HH:mm:ss'
    label: { type: DataTypes.STRING, allowNull: true },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get() { const v = this.getDataValue('price'); return v === null || v === undefined ? v : parseFloat(v); }, // cast float
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      get() { const v = this.getDataValue('sort_order'); return v === null || v === undefined ? v : parseInt(v, 10); },
    },
    is_active: boolField(DataTypes, 'is_active', true),
  }, {
    tableName: 'time_slots',
    paranoid: true,
    deletedAt: 'deleted_at',
    scopes: {
      active: { where: { is_active: true } },
      ordered: { order: [['sort_order', 'ASC'], ['slot_time', 'ASC']] },
    },
  });

  addFillable(TimeSlot, ['slot_time', 'label', 'price', 'sort_order', 'is_active']);

  TimeSlot.associate = (models) => {
    TimeSlot.hasMany(models.BlockedSlot, { foreignKey: 'time_slot_id', as: 'blockedSlots' });
  };

  // getDisplayLabelAttribute: label if set, else slot_time as "g:i A" (e.g. 9:00 AM). Not in $appends.
  Object.defineProperty(TimeSlot.prototype, 'display_label', {
    get() {
      if (this.label) return this.label;
      return dayjs(`2000-01-01 ${this.slot_time}`, 'YYYY-MM-DD HH:mm:ss').format('h:mm A');
    },
  });

  return TimeSlot;
};
