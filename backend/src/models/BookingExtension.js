const { dayjs } = require('../utils/time');
const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BookingExtension = sequelize.define('BookingExtension', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    payment_status: { type: DataTypes.STRING, defaultValue: 'pending' },
    razorpay_link_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_payment_url: { type: DataTypes.TEXT, allowNull: true },
    razorpay_order_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_signature: { type: DataTypes.STRING, allowNull: true },
    payment_attempted_at: { type: DataTypes.DATE, allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'booking_extensions' });

  // Payment status constants
  BookingExtension.PAYMENT_PENDING = 'pending';
  BookingExtension.PAYMENT_PAID = 'paid';
  BookingExtension.PAYMENT_FAILED = 'failed';

  addFillable(BookingExtension, [
    'booking_id', 'duration_minutes', 'amount', 'payment_status', 'razorpay_link_id', 'razorpay_payment_url',
    'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'payment_attempted_at', 'paid_at',
  ]);

  BookingExtension.associate = (models) => {
    BookingExtension.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  };

  // Helper methods
  BookingExtension.prototype.markPaid = async function markPaid(options = {}) {
    await this.update({
      payment_status: BookingExtension.PAYMENT_PAID,
      paid_at: dayjs().toDate(),
    }, options);
  };

  BookingExtension.prototype.isPaid = function isPaid() {
    return this.payment_status === BookingExtension.PAYMENT_PAID;
  };

  return BookingExtension;
};
