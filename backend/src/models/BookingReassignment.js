const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BookingReassignment = sequelize.define('BookingReassignment', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    old_worker_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    new_worker_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    changed_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, { tableName: 'booking_reassignments' });

  addFillable(BookingReassignment, ['booking_id', 'old_worker_id', 'new_worker_id', 'changed_by']);

  BookingReassignment.associate = (models) => {
    BookingReassignment.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    BookingReassignment.belongsTo(models.User, { foreignKey: 'old_worker_id', as: 'oldWorker' });
    BookingReassignment.belongsTo(models.User, { foreignKey: 'new_worker_id', as: 'newWorker' });
    BookingReassignment.belongsTo(models.User, { foreignKey: 'changed_by', as: 'changedBy' });
  };
  return BookingReassignment;
};
