// PHP: CancelUnpaidBookingJob::dispatch($bookingId)->delay(...)  -> payload { bookingId }
const queue = require('./queue');
const { Booking } = require('../models');

async function handle({ bookingId } = {}) {
  const booking = await Booking.findByPk(bookingId);

  // Booking removed or already finalized
  if (!booking) return;

  // CANCEL ONLY IF payment not initiated and booking still pending.
  // DO NOT cancel if verification_pending / paid / rejected.
  if (booking.status === 'pending' && booking.payment_status === 'unpaid') {
    await booking.update({ status: 'cancelled' });
  }
}

queue.register('CancelUnpaidBookingJob', handle);
module.exports = { handle };
