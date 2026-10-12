const { dayjs } = require('../utils/time');
const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BookingPause = sequelize.define('BookingPause', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    pause_from: { type: DataTypes.DATEONLY, allowNull: false },   // cast 'date'
    pause_until: { type: DataTypes.DATEONLY, allowNull: false },  // cast 'date'
    pause_days: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
      get() { const v = this.getDataValue('pause_days'); return v === null || v === undefined ? v : parseInt(v, 10); },
    },
    extended_end_date: { type: DataTypes.DATEONLY, allowNull: true }, // cast 'date'
    resumed_at: { type: DataTypes.DATE, allowNull: true },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    paused_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, // null = legacy customer pause
    paused_by_role: { type: DataTypes.STRING(50), allowNull: true },
  }, { tableName: 'booking_pauses' });

  addFillable(BookingPause, [
    'booking_id', 'pause_from', 'pause_until', 'pause_days', 'extended_end_date', 'resumed_at', 'reason',
    'paused_by', 'paused_by_role',
  ]);

  BookingPause.associate = (models) => {
    BookingPause.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    BookingPause.belongsTo(models.User, { foreignKey: 'paused_by', as: 'pausedBy' });
  };

  /** Whether this pause record is currently active (not yet resumed or expired). */
  BookingPause.prototype.isActive = function isActive() {
    if (this.resumed_at) return false;
    const from = dayjs(this.pause_from).startOf('day');
    const until = dayjs(this.pause_until).endOf('day');
    const now = dayjs();
    return !now.isBefore(from) && !now.isAfter(until);
  };

  return BookingPause;
};
