const { addFillable } = require('./concerns/casts');

// One-day time override for a monthly subscription booking (unique per booking_id + visit_date).
module.exports = (sequelize, DataTypes) => {
  const BookingVisitOverride = sequelize.define('BookingVisitOverride', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    visit_date: { type: DataTypes.DATEONLY, allowNull: false },
    time_slot: { type: DataTypes.STRING, allowNull: false },
    moved_from_date: { type: DataTypes.DATEONLY, allowNull: true },
  }, { tableName: 'booking_visit_overrides' });

  addFillable(BookingVisitOverride, ['booking_id', 'visit_date', 'time_slot', 'moved_from_date']);

  BookingVisitOverride.associate = (models) => {
    BookingVisitOverride.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  };
  return BookingVisitOverride;
};
