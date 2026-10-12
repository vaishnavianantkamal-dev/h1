// WebBookingController: rescheduleMonthly, getRescheduleHistory
const { QueryTypes } = require('sequelize');
const sequelize = require('../../config/db');
const config = require('../../config');
const validate = require('../../utils/validate');
const { dayjs } = require('../../utils/time');
const { Setting, Service, BookingVisitOverride } = require('../../models');
const H = require('./webBooking.helpers');

const DT = 'YYYY-MM-DD HH:mm:ss';

async function rescheduleMonthly(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  const data = await validate(req, {
    date: 'required|date',
    time_slot: 'required|string',
    reason: 'nullable|string|max:255',
  });

  const lines = await booking.getServices({ include: [{ association: 'subscriptionType', required: false }] });

  const maxPerMonth = Number(config.services.rescheduleMaxPerMonth) || 0;
  const maxPerWeek = Number(config.services.rescheduleMaxPerWeek) || 0;
  const instantMinHours = Number(config.services.rescheduleInstantMinHours) || 0;
  const monthlyMinHours = Number(config.services.rescheduleMonthlyMinHours) || 0;
  const monthlyTypeId = Number(config.services.monthlySubscriptionTypeId) || 0;

  const monthlyService = lines.find((s) => Number(s.subscription_type_id) === monthlyTypeId) || null;
  const isMonthly = monthlyService !== null;

  const visitDate = dayjs(data.date).format('YYYY-MM-DD');

  // VISIT START TIME (the anchor for the cutoff).
  // Monthly: the date + slot the customer picks in the app. Instant: the imminent visit stored on the booking.
  let currentStart = null;
  {
    let rawSlot;
    let anchorDate;
    if (isMonthly) {
      rawSlot = data.time_slot;
      anchorDate = visitDate;
    } else {
      rawSlot = booking.time_slot;
      anchorDate = booking.booking_date;
    }
    const slotStart = String(rawSlot || '').trim().split(' - ')[0].trim();
    const slot = H.parseG_i_A(slotStart);
    const anchor = dayjs(anchorDate);
    if (slot && anchorDate && anchor.isValid()) {
      currentStart = anchor.startOf('day').hour(slot.hour).minute(slot.minute).second(0);
    } // unparseable slot -> skip time-cutoff gate
  }

  // TIME-BASED CUTOFF
  if (currentStart) {
    if (isMonthly) {
      const deadline = currentStart.subtract(monthlyMinHours, 'hour');
      if (!dayjs().isBefore(deadline)) {
        return res.status(422).json({
          success: false,
          message: `Monthly visits can only be rescheduled at least ${monthlyMinHours} hours before the visit start time.`,
        });
      }
    } else {
      const deadline = currentStart.subtract(instantMinHours, 'hour');
      if (!dayjs().isBefore(deadline)) {
        return res.status(422).json({
          success: false,
          message: `Instant bookings must be rescheduled at least ${instantMinHours} hours before the booking start time.`,
        });
      }
    }
  }

  // CLOSING-TIME CUTOFF: new slot + service duration must not run past business closing time.
  try {
    const newSlotStart = String(data.time_slot).trim().split(' - ')[0].trim();
    const newSlot = H.parseG_i_A(newSlotStart);
    if (!newSlot) throw new Error('unparseable slot');
    const newVisitStart = dayjs(visitDate).startOf('day').hour(newSlot.hour).minute(newSlot.minute).second(0);

    const service = booking.service_id ? await Service.findByPk(booking.service_id) : null;
    const serviceDuration = parseInt((service && service.duration_minutes) ?? 60, 10) || 0;
    const closingTime = await Setting.get('business_closing_time', '18:00');
    const closingDateTime = H.parseDateTime(visitDate, closingTime);
    if (!closingDateTime) throw new Error('unparseable closing time');

    if (newVisitStart.add(serviceDuration, 'minute').isAfter(closingDateTime)) {
      return res.status(422).json({
        success: false,
        message: `This slot cannot be rescheduled — the service would end after business closing time (${closingTime}).`,
      });
    }
  } catch (e) {
    // ignore (PHP swallows parse failures here)
  }

  // MAX RESCHEDULES PER CALENDAR MONTH / WEEK (monthly subscriptions only)
  let rescheduleCountThisMonth = 0;
  if (isMonthly) {
    const currentMonthStart = dayjs().startOf('month').format(DT);
    const currentMonthEnd = dayjs().endOf('month').format(DT) + '.999999';

    const [{ c: monthCount }] = await sequelize.query(
      'SELECT COUNT(*) AS c FROM booking_reschedules WHERE booking_id = ? AND created_at BETWEEN ? AND ?',
      { replacements: [booking.id, currentMonthStart, currentMonthEnd], type: QueryTypes.SELECT }
    );
    rescheduleCountThisMonth = Number(monthCount);

    if (rescheduleCountThisMonth >= maxPerMonth) {
      return res.status(422).json({
        success: false,
        message: `You have reached the maximum of ${maxPerMonth} reschedules allowed per month.`,
        reschedules_used: rescheduleCountThisMonth,
        reschedules_left: 0,
      });
    }

    // Weekly cap (Monday-Sunday), on top of the monthly cap.
    const nowD = dayjs();
    const weekStartD = nowD.subtract((nowD.day() + 6) % 7, 'day').startOf('day'); // Monday 00:00
    const currentWeekStart = weekStartD.format(DT);
    const currentWeekEnd = weekStartD.add(6, 'day').endOf('day').format(DT) + '.999999'; // Sunday 23:59

    const [{ c: weekCount }] = await sequelize.query(
      'SELECT COUNT(*) AS c FROM booking_reschedules WHERE booking_id = ? AND created_at BETWEEN ? AND ?',
      { replacements: [booking.id, currentWeekStart, currentWeekEnd], type: QueryTypes.SELECT }
    );
    const rescheduleCountThisWeek = Number(weekCount);

    if (rescheduleCountThisWeek >= maxPerWeek) {
      return res.status(422).json({
        success: false,
        message: `You can only reschedule ${maxPerWeek} time(s) per week. Please try again next week.`,
        reschedules_used: rescheduleCountThisMonth,
        reschedules_left: Math.max(0, maxPerMonth - rescheduleCountThisMonth),
      });
    }

    // VISIT DAY MUST BE WITHIN THE SUBSCRIPTION PERIOD
    if (monthlyService.start_date && monthlyService.end_date) {
      const newDay = dayjs(visitDate).startOf('day');
      const start = dayjs(monthlyService.start_date).startOf('day');
      const end = dayjs(monthlyService.end_date).endOf('day');

      if (newDay.isBefore(start) || newDay.isAfter(end)) {
        return res.status(422).json({
          success: false,
          message: 'Reschedule date must be within the subscription period ('
            + start.format('YYYY-MM-DD') + ' – ' + end.format('YYYY-MM-DD') + ').',
        });
      }
    }
  }

  try {
    await sequelize.transaction(async (t) => {
      if (isMonthly) {
        // MONTHLY: one-day visit override. The bookings row (booking_date / time_slot / status) is NOT touched.
        const oldSlot = await booking.effectiveTimeSlotFor(visitDate);

        await sequelize.query(
          'INSERT INTO booking_reschedules (booking_id, old_date, old_time_slot, new_date, new_time_slot, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          {
            replacements: [booking.id, visitDate, oldSlot, visitDate, data.time_slot, data.reason ?? null, dayjs().format(DT)],
            type: QueryTypes.INSERT, transaction: t,
          }
        );

        // BookingVisitOverride::updateOrCreate
        const existing = await BookingVisitOverride.findOne({
          where: { booking_id: booking.id, visit_date: visitDate }, transaction: t,
        });
        if (existing) {
          await existing.update({ time_slot: data.time_slot, moved_from_date: visitDate }, { transaction: t });
        } else {
          await BookingVisitOverride.create({
            booking_id: booking.id, visit_date: visitDate, time_slot: data.time_slot, moved_from_date: visitDate,
          }, { transaction: t });
        }
      } else {
        // SINGLE-VISIT (instant / one-time): the booking IS the visit, so its date + time move directly.
        await sequelize.query(
          'INSERT INTO booking_reschedules (booking_id, old_date, old_time_slot, new_date, new_time_slot, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          {
            replacements: [booking.id, H.dateStr(booking.booking_date), booking.time_slot, visitDate, data.time_slot, data.reason ?? null, dayjs().format(DT)],
            type: QueryTypes.INSERT, transaction: t,
          }
        );

        booking.booking_date = visitDate;
        booking.time_slot = data.time_slot;
      }

      booking.reschedule_count = H.toInt(booking.reschedule_count) + 1;
      booking.last_rescheduled_at = new Date();
      await booking.save({ transaction: t });
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to reschedule booking.' });
  }

  // NOTIFY THE ASSIGNED WORKER(S) - never let a notification failure break the response.
  try {
    const workerIds = H.bookingWorkerIds(booking);

    if (workerIds.length) {
      const tokens = await H.fcmTokensFor(workerIds);

      if (tokens.length) {
        await H.sendToMultiple(
          tokens,
          'Booking Rescheduled 🔁',
          `Booking #${booking.id}: the visit on ${visitDate} is now at ${data.time_slot}.`,
          {
            type: 'booking_rescheduled',
            booking_id: String(booking.id),
            visit_date: visitDate,
            time_slot: data.time_slot,
          }
        );
      }
    }
  } catch (e) {
    console.error('Reschedule worker notification failed: ' + e.message);
  }

  const reschedulesDoneNow = isMonthly ? rescheduleCountThisMonth + 1 : null;
  const reschedulesLeft = isMonthly ? Math.max(0, maxPerMonth - reschedulesDoneNow) : null;

  return res.json({
    success: true,
    message: 'Booking rescheduled successfully.',
    data: {
      id: booking.id,
      booking_type: isMonthly ? 'monthly' : 'instant',
      visit_date: visitDate,
      time_slot: data.time_slot,
      is_rescheduled: true,
      reschedules_used: reschedulesDoneNow,
      reschedules_left: reschedulesLeft,
    },
  });
}

// GET reschedule history for a booking (public route in Laravel - no auth).
async function getRescheduleHistory(req, res) {
  const booking = await H.bindBooking(req);
  const { User } = require('../../models');
  const user = booking.customer_id ? await User.findByPk(booking.customer_id) : null;

  const historyRows = await sequelize.query(
    'SELECT id, old_date, old_time_slot, new_date, new_time_slot, reason, created_at FROM booking_reschedules WHERE booking_id = ? ORDER BY created_at DESC',
    { replacements: [booking.id], type: QueryTypes.SELECT }
  );

  const history = historyRows.map((r) => ({ ...r, created_at: r.created_at instanceof Date ? H.dateTimeStr(r.created_at) : r.created_at }));

  const keys = [
    'id', 'name', 'phone', 'email', 'role_id', 'public_id',
    'city_id', 'zone_id', 'area_id', 'is_active', 'referral_code',
    'referred_by', 'referred_by_type', 'referral_points', 'images',
    'created_at', 'updated_at',
  ];
  let userDetails = null;
  if (user) {
    userDetails = {};
    const uj = user.toJSON();
    for (const k of keys) {
      const v = uj[k];
      userDetails[k] = v === undefined ? null : v;
    }
  }

  const bj = booking.toJSON();
  return res.json({
    success: true,
    data: {
      booking_id: booking.id,
      current_booking_date: bj.booking_date,
      current_time_slot: booking.time_slot,
      reschedule_count: bj.reschedule_count,
      last_rescheduled_at: bj.last_rescheduled_at,
      history,
      user: userDetails,
    },
  });
}

module.exports = { rescheduleMonthly, getRescheduleHistory };
