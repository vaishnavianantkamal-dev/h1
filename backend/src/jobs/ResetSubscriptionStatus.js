// PHP: scheduled every minute via Schedule::call(fn => (new ResetSubscriptionStatus())->handle()). No payload.
const { QueryTypes, Op, fn, col, where } = require('sequelize');
const queue = require('./queue');
const { sequelize, Booking, BookingVisitOverride } = require('../models');
const { dayjs } = require('../utils/time');
const { parseG } = require('../utils/carbonParse');

const TYPES = ['Monthly Subscription', 'monthly'];

// Carbon::createFromFormat('g:i A', $s) - throws when it does not match
function parseSlot(slot) {
  const t = parseG(slot);
  if (t === null) throw new Error('Could not parse time_slot');
  const m = t % 1440;
  return { hour: () => Math.floor(m / 60), minute: () => m % 60 };
}

async function handle() {
  const now = dayjs();
  const todayStr = now.format('YYYY-MM-DD');
  const today = now.startOf('day');

  // First trigger: completed -> pending at next-day midnight
  const completed = await sequelize.query(
    `SELECT bookings.id, bookings.time_slot, bookings.service_ended_at
       FROM bookings
       JOIN booking_services ON bookings.id = booking_services.booking_id
      WHERE bookings.status = 'completed'
        AND bookings.service_ended_at IS NOT NULL
        AND booking_services.booking_type IN (:types)
        AND DATE(booking_services.end_date) >= :today`,
    { replacements: { types: TYPES, today: todayStr }, type: QueryTypes.SELECT }
  );

  for (const booking of completed) {
    // Next day midnight (00:00:00)
    const pendingAt = dayjs(booking.service_ended_at).add(1, 'day').startOf('day');

    if (!now.isBefore(pendingAt)) {
      // query-builder update (no model events); service_ended_at cleared so this block will not re-trigger
      await Booking.update({ status: 'pending', service_ended_at: null }, { where: { id: booking.id } });
    }
  }

  // Second trigger: pending -> assigned at time_slot
  const pendingBookings = await sequelize.query(
    `SELECT bookings.id, bookings.time_slot, bookings.updated_at
       FROM bookings
       JOIN booking_services ON bookings.id = booking_services.booking_id
      WHERE bookings.status = 'pending'
        AND booking_services.booking_type IN (:types)
        AND DATE(booking_services.start_date) <= :today
        AND DATE(booking_services.end_date) >= :today
        AND bookings.worker_id IS NOT NULL`,
    { replacements: { types: TYPES, today: todayStr }, type: QueryTypes.SELECT }
  );

  // One-day reschedules: if the customer moved TODAY's visit to another time, use the overridden time.
  const todayOverrides = {};
  if (pendingBookings.length > 0) {
    const overrides = await BookingVisitOverride.findAll({
      where: {
        [Op.and]: [
          { booking_id: { [Op.in]: pendingBookings.map((b) => b.id) } },
          where(fn('DATE', col('visit_date')), todayStr),
        ],
      },
    });
    // pluck('time_slot','booking_id'): last row wins
    for (const o of overrides) todayOverrides[o.booking_id] = o.time_slot;
  }

  for (const booking of pendingBookings) {
    // Today's effective slot (override wins over the default)
    const slotString = todayOverrides[booking.id] ?? booking.time_slot;
    const slotTime = parseSlot(slotString);

    // Trigger today at slot time
    const assignedAt = today.hour(slotTime.hour()).minute(slotTime.minute()).second(0);

    if (!now.isBefore(assignedAt)) {
      await Booking.update({ status: 'assigned' }, { where: { id: booking.id } });
    }
  }
}

queue.register('ResetSubscriptionStatus', handle);
module.exports = { handle };
