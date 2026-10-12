// PHP: AutoSendCloseOtpIfNotExtendedJob::dispatch($bookingId, $extensionCountAtReminder)->delay(...)
// payload { bookingId, extensionCountAtReminder }
const queue = require('./queue');
const { Booking } = require('../models');
const OtpService = require('../services/OtpService');

async function handle({ bookingId, extensionCountAtReminder } = {}) {
  const booking = await Booking.findByPk(bookingId);

  if (!booking) return;
  if (booking.status !== 'inprogress') return;
  if (booking.service_ended_at) return;

  // If extended after reminder -> do nothing
  if (Number(booking.extension_count) > Number(extensionCountAtReminder)) return;

  await OtpService.sendCloseOtp(booking);
}

queue.register('AutoSendCloseOtpIfNotExtendedJob', handle);
module.exports = { handle };
