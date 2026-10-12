const { Op } = require('sequelize');
const { dayjs } = require('../utils/time');
const { addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const BookingOtp = sequelize.define('BookingOtp', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    receiver_type: { type: DataTypes.STRING(20), allowNull: false }, // enum customer|worker
    shown_to: { type: DataTypes.STRING, allowNull: true },
    typed_by: { type: DataTypes.STRING, allowNull: true },
    receiver_phone: { type: DataTypes.STRING(20), allowNull: false },
    otp: { type: DataTypes.STRING(6), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false }, // enum start|close
    expires_at: { type: DataTypes.DATE, allowNull: false },
    verified_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'booking_otps',
    timestamps: false, // $timestamps = false
    scopes: {
      active: () => ({ where: { verified_at: null, expires_at: { [Op.gt]: dayjs().toDate() } } }),
      ofType: (type) => ({ where: { type } }),
      forBooking: (bookingId) => ({ where: { booking_id: bookingId } }),
    },
  });

  addFillable(BookingOtp, [
    'booking_id', 'receiver_type', 'receiver_phone', 'otp', 'type', 'shown_to', 'typed_by', 'expires_at', 'verified_at',
  ]);

  BookingOtp.associate = (models) => {
    BookingOtp.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  };
  return BookingOtp;
};
