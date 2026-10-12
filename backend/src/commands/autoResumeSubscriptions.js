// subscriptions:auto-resume - Auto-resume paused subscriptions whose pause_until date has been reached
const { sequelize, BookingPause, Booking } = require('../models');
const { fn, col, where, Op } = require('sequelize');
const { dayjs } = require('../utils/time');

async function run() {
  const today = dayjs().format('YYYY-MM-DD');

  // pause_until <= today and not yet manually resumed (resumed_at is null)
  const expiredPauses = await BookingPause.findAll({
    where: { [Op.and]: [{ resumed_at: null }, where(fn('DATE', col('pause_until')), '<=', today)] },
    include: [{ model: Booking, as: 'booking' }],
  });

  if (expiredPauses.length === 0) {
    console.log('No paused subscriptions to resume today.');
    return;
  }

  let resumed = 0;
  let skipped = 0;

  for (const pause of expiredPauses) {
    const booking = pause.booking;

    if (!booking) {
      console.warn(`Pause #${pause.id}: booking not found, skipping.`);
      skipped++;
      continue;
    }

    if (booking.status !== 'paused') {
      // Already resumed manually or cancelled - just mark pause as closed
      await pause.update({ resumed_at: new Date() });
      console.log(`Pause #${pause.id}: booking #${booking.id} is '${booking.status}', closing pause record only.`);
      skipped++;
      continue;
    }

    try {
      await sequelize.transaction(async (t) => {
        await pause.update({ resumed_at: new Date() }, { transaction: t });
        await booking.update({ status: 'confirmed' }, { transaction: t });
      });
      console.log(`Booking #${booking.id} auto-resumed successfully.`);
      resumed++;
    } catch (e) {
      console.error(`Auto-resume failed for booking #${booking.id}: ${e.message}`);
      console.error(`Booking #${booking.id} failed: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Done. Resumed: ${resumed}, Skipped/Errors: ${skipped}.`);
}

module.exports = { run };
