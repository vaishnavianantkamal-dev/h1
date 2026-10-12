// instant:cron - Handle instant booking lifecycle (10-min extend reminder push)
const { Op } = require('sequelize');
const { Booking, Service, UserFcmToken } = require('../models');
const config = require('../config');
const { dayjs } = require('../utils/time');
const CustomerFirebaseService = require('../services/CustomerFirebaseService');

async function run() {
  const now = dayjs();

  const bookings = await Booking.findAll({
    where: { status: 'inprogress', service_end_at: { [Op.ne]: null }, service_ended_at: null },
    include: [{ model: Service, as: 'service' }],
  });

  for (const booking of bookings) {
    const isInstant = booking.service && Number(booking.service.category_id) === Number(config.services.instantCategoryId);
    if (!isInstant) continue;

    // Carbon 3 diffInMinutes(end, false): signed FLOAT (not truncated)
    const minutesLeft = dayjs(booking.service_end_at).diff(now, 'minute', true);

    // REMINDER (10 MIN)
    if (minutesLeft <= 10 && minutesLeft > 0) {
      if (booking.reminder_sent_at === null || booking.reminder_sent_at === undefined) {
        const rows = await UserFcmToken.findAll({ where: { user_id: booking.customer_id } });
        const tokens = [...new Set(rows.map((r) => r.fcm_token).filter(Boolean))];

        await CustomerFirebaseService.sendToMultiple(
          tokens,
          'Service ending soon',
          'Your service is ending soon. Tap to extend.',
          { type: 'service_ending_extend', booking_id: String(booking.id) },
        );

        await booking.update({ reminder_sent_at: new Date() });
      }
    }

    // No auto-complete, no auto close-OTP: past service_end_at, the booking stays inprogress until the
    // worker manually triggers close.
  }
}

module.exports = { run };
