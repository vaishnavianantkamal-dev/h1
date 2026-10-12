// bookings:send-alerts - Create alerts for bookings starting in ~15 minutes
const { Op, literal, fn, col, where } = require('sequelize');
const { Booking, BookingAlert, BookingService, Service, User } = require('../models');
const config = require('../config');
const { dayjs } = require('../utils/time');
const { parseG, parseH } = require('../utils/carbonParse');

// Carbon::createFromFormat('Y-m-d g:i A') then ('Y-m-d H:i'); throws when neither matches (PHP quirks emulated)
function parseSlot(today, timeSlot) {
  const slot = String(timeSlot ?? '').replace(/^[ 	]+/, '');
  let t = parseG(slot);
  if (t === null) t = parseH(slot);
  if (t === null) throw new Error('Could not parse time_slot');
  return dayjs(today + ' 00:00:00').add(t, 'minute');
}

const noAlertToday = literal(
  'NOT EXISTS (SELECT 1 FROM booking_alerts ba WHERE ba.booking_id = Booking.id AND DATE(ba.created_at) = CURDATE())'
);

async function run() {
  await BookingAlert.destroy({ where: { created_at: { [Op.lt]: dayjs().subtract(1, 'day').toDate() } } });

  const now = dayjs();
  const today = now.format('YYYY-MM-DD');

  // "Hobit Weekday" bookings don't run Sat/Sun, so skip alerting for that category on those two days.
  const weekdayCategoryId = config.services.weekdayCategoryId;
  const isWeekend = now.day() === 0 || now.day() === 6;

  // CASE 1: Instant bookings - match booking_date
  const instantBookings = await Booking.findAll({
    where: {
      [Op.and]: [
        { status: { [Op.in]: ['pending', 'confirmed', 'assigned'] } },
        { booking_date: today },
        noAlertToday,
        literal("EXISTS (SELECT 1 FROM booking_services bs WHERE bs.booking_id = Booking.id AND bs.booking_type = 'instant')"),
      ],
    },
    include: [{ model: Service, as: 'service' }],
  });

  // CASE 2: Subscription bookings - today between start_date and end_date
  const subscriptionBookings = await Booking.findAll({
    where: {
      [Op.and]: [
        { status: { [Op.notIn]: ['cancelled'] } },
        noAlertToday,
        literal(
          "EXISTS (SELECT 1 FROM booking_services bs WHERE bs.booking_id = Booking.id AND bs.booking_type != 'instant'" +
            ` AND bs.start_date <= ${Booking.sequelize.escape(today)} AND bs.end_date >= ${Booking.sequelize.escape(today)})`
        ),
      ],
    },
    include: [{ model: Service, as: 'service' }],
  });

  // merge()->unique('id')
  const seen = new Set();
  const allBookings = [];
  for (const b of [...instantBookings, ...subscriptionBookings]) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    allBookings.push(b);
  }

  console.log(`Found ${allBookings.length} bookings to check...`);

  for (const booking of allBookings) {
    try {
      const timeSlot = booking.time_slot;
      const bookingDateTime = parseSlot(today, timeSlot);

      // Carbon 3 diffInMinutes($bookingDateTime, false): signed FLOAT (not truncated)
      const diffInMinutes = bookingDateTime.diff(now, 'minute', true);

      console.log(`Booking #${booking.id} | time_slot: ${timeSlot} | diff: ${parseFloat(diffInMinutes.toPrecision(14))} mins`);

      if (diffInMinutes >= 14 && diffInMinutes <= 16) {
        if (isWeekend && weekdayCategoryId && Number((booking.service && booking.service.category_id) || 0) === Number(weekdayCategoryId)) {
          console.log(`Skipped Booking #${booking.id} — Hobit Weekday category, weekend.`);
          continue;
        }

        const alreadyExists = await BookingAlert.findOne({
          where: { [Op.and]: [{ booking_id: booking.id }, where(fn('DATE', col('created_at')), dayjs().format('YYYY-MM-DD'))] },
        });
        if (alreadyExists) {
          console.log(`Skipped Booking #${booking.id} — alert already sent today.`);
          continue;
        }

        const firstService = await BookingService.findOne({ where: { booking_id: booking.id }, order: [['id', 'ASC']] });
        const bookingType = (firstService && firstService.booking_type) || 'instant';
        const typeLabel = bookingType === 'instant' ? 'Instant' : 'Subscription';

        const worker = booking.worker_id ? await User.findByPk(booking.worker_id) : null;

        await BookingAlert.create({
          booking_id: booking.id,
          message: `[${typeLabel}] Booking #${booking.id} for ${booking.customer_name ?? ''} starts in 15 minutes at ${booking.time_slot ?? ''}. Worker: ${worker ? worker.name ?? '' : ''}. Address: ${booking.address ?? ''}`,
          is_read: false,
          alert_sent_at: now.toDate(),
        });

        console.log(`✅ Alert created for Booking #${booking.id} (${typeLabel})`);
      }
    } catch (e) {
      console.error(`❌ Error on Booking #${booking.id}: ${e.message}`);
    }
  }

  console.log('Done.');
}

module.exports = { run };
