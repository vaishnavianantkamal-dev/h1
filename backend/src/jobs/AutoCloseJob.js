// PHP: AutoCloseJob::dispatch($booking)  -> payload { bookingId }
const queue = require('./queue');
const { Booking } = require('../models');

async function handle({ bookingId } = {}) {
  const booking = await Booking.findByPk(bookingId);

  if (!booking) return;
  if (booking.status !== 'inprogress') return;
  if (booking.service_ended_at) return;
  if (!booking.reminder_sent_at) return;

  await booking.update({ service_ended_at: new Date(), status: 'completed' });

  // app(BookingOtpController::class)->sendCloseOtpAutomatically($booking)
  // NOTE: this method does not exist in the PHP BookingOtpController either (PHP would throw here).
  const ctrl = require('../modules/booking-otp/bookingOtp.controller');
  if (typeof ctrl.sendCloseOtpAutomatically !== 'function') {
    throw new Error('Call to undefined method BookingOtpController::sendCloseOtpAutomatically()');
  }
  await ctrl.sendCloseOtpAutomatically(booking);
}

queue.register('AutoCloseJob', handle);
module.exports = { handle };
