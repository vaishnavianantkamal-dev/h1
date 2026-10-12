// PHP: InstantServiceReminderJob::dispatch($booking)->delay(...)  -> payload { bookingId }
const queue = require('./queue');
const { Booking } = require('../models');

async function handle({ bookingId } = {}) {
  const booking = await Booking.findByPk(bookingId);

  if (!booking || booking.status !== 'inprogress') return;
  if (booking.service_ended_at) return;

  // No-op: the only extend push is InstantBookingCron's 10-min-before reminder. This job still gets dispatched
  // from BookingOtpController but intentionally sends nothing, so there is a single notification.
}

queue.register('InstantServiceReminderJob', handle);
module.exports = { handle };
