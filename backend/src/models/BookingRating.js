const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BookingRating = sequelize.define('BookingRating', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
    worker_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    customer_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    rating: { type: DataTypes.TINYINT, allowNull: false }, // 1 to 5 stars
    description: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'booking_ratings' });

  addFillable(BookingRating, ['booking_id', 'worker_id', 'customer_id', 'rating', 'description']);

  BookingRating.associate = (models) => {
    BookingRating.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    BookingRating.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
    BookingRating.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker' });
  };
  return BookingRating;
};
