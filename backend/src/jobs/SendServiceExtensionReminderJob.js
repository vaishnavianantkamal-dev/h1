// PHP: SendServiceExtensionReminderJob::dispatch($bookingId)->delay(...)  -> payload { bookingId }
const queue = require('./queue');
const config = require('../config');
const { Booking } = require('../models');
const OtpService = require('../services/OtpService');

async function handle({ bookingId } = {}) {
  const booking = await Booking.findByPk(bookingId);

  if (!booking) return;
  if (booking.status !== 'inprogress') return;
  if (!booking.service_end_at) return;
  if (booking.service_ended_at) return;

  const extendUrl = `${config.appUrl}/api/instant-bookings/${booking.id}/extend`;

  const message = '⏰ Aapki service 10 minutes mein khatam hone wali hai.\n\n' + 'Extend karne ke liye button dabayein.';

  await OtpService.sendWhatsappWithButton(booking.customer_phone, message, [
    { type: 'url', text: 'Extend Service', url: extendUrl },
  ]);

  await booking.update({ reminder_sent_at: new Date() });

  // Auto close in 10 mins if no extension
  await queue.dispatch(
    'AutoSendCloseOtpIfNotExtendedJob',
    { bookingId: booking.id, extensionCountAtReminder: booking.extension_count },
    { delaySeconds: 10 * 60 }
  );
}

queue.register('SendServiceExtensionReminderJob', handle);
module.exports = { handle };
