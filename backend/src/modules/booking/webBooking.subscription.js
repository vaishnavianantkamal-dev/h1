// WebBookingController: subscription pause / resume / cancel / pause-history (customer + admin side)
const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const config = require('../../config');
const validate = require('../../utils/validate');
const { dayjs } = require('../../utils/time');
const { isCityLocked } = require('../../utils/cityScoped');
const { Booking, BookingPause } = require('../../models');
const H = require('./webBooking.helpers');

const DT = 'YYYY-MM-DD HH:mm:ss';

// First service line that carries a subscription_type_id
const firstSubscriptionLine = async (booking, withType = false) => {
  const lines = await booking.getServices(withType ? { include: [{ association: 'subscriptionType', required: false }] } : {});
  return lines.find((s) => s.subscription_type_id !== null && s.subscription_type_id !== undefined) || null;
};

async function pauseSubscription(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized access' });
  }

  return applySubscriptionPause(req, res, booking, customer, false);
}

// Lets support staff pause a subscription on the customer's behalf.
async function adminPauseSubscription(req, res) {
  const booking = await H.bindBooking(req);
  const actor = req.user;

  if (!canManageBookingAsAdmin(req, booking, actor)) {
    return res.status(403).json({
      success: false,
      message: 'This booking does not belong to your city.',
    });
  }

  return applySubscriptionPause(req, res, booking, actor, true);
}

// City gate for the admin subscription endpoints.
function canManageBookingAsAdmin(req, booking, actor) {
  if (!isCityLocked(req)) return true;
  return !!actor.city_id && Number(booking.city_id) === Number(actor.city_id);
}

// Shared pause engine used by both the customer and the admin endpoints.
async function applySubscriptionPause(req, res, booking, actor, adminInitiated) {
  const data = await validate(req, {
    pause_from: ['required', 'date', 'after_or_equal:today'],
    pause_until: ['required', 'date', 'after:pause_from'],
    reason: ['nullable', 'string', 'max:255'],
  });

  const subscriptionService = await firstSubscriptionLine(booking, true);

  if (!subscriptionService) {
    return res.status(422).json({
      success: false,
      message: 'Only monthly subscription bookings can be paused.',
    });
  }

  const pauseFrom = H.carbonStartOfDay(H.carbonParse(data.pause_from));
  const pauseUntil = H.carbonStartOfDay(H.carbonParse(data.pause_until));
  const pauseFromStr = H.carbonYmd(pauseFrom);
  const pauseUntilStr = H.carbonYmd(pauseUntil);
  // Carbon 3 diffInDays() is a signed float (fractional when the two dates carry different offsets)
  const pauseDays = (pauseUntil.ms - pauseFrom.ms) / H.DAY_MS;

  // Minimum pause length is 7 days.
  if (pauseDays < 7) {
    return res.status(422).json({
      success: false,
      message: 'Pause duration must be at least 7 days.',
    });
  }

  // Pause cannot run past the subscription's end date.
  if (subscriptionService.end_date) {
    const subscriptionEnd = dayjs(subscriptionService.end_date).endOf('day');
    if (pauseUntil.ms > subscriptionEnd.valueOf()) {
      return res.status(422).json({
        success: false,
        message: 'Pause end date cannot exceed your subscription end date ('
          + subscriptionEnd.format('YYYY-MM-DD') + ').',
      });
    }
  }

  // Overlap check against any active (not yet resumed) pause.
  const fromStr = H.carbonDateTime(pauseFrom);
  const untilStr = H.carbonDateTime(pauseUntil);
  const overlaps = (await BookingPause.count({
    where: {
      booking_id: booking.id,
      resumed_at: null,
      [Op.or]: [
        { pause_from: { [Op.between]: [fromStr, untilStr] } },
        { pause_until: { [Op.between]: [fromStr, untilStr] } },
        { [Op.and]: [{ pause_from: { [Op.lte]: fromStr } }, { pause_until: { [Op.gte]: untilStr } }] },
      ],
    },
  })) > 0;

  if (overlaps) {
    return res.status(422).json({
      success: false,
      message: 'An active pause already exists that overlaps with the requested dates.',
    });
  }


  // Extend the subscription end date by the pause length.
  const currentEndDate = subscriptionService.end_date ? dayjs(subscriptionService.end_date) : null;
  const newEndDate = currentEndDate ? dayjs(currentEndDate.startOf('day').valueOf() + pauseDays * H.DAY_MS).format('YYYY-MM-DD') : null;

  await sequelize.transaction(async (t) => {
    if (newEndDate) {
      await subscriptionService.update({ end_date: newEndDate }, { transaction: t });
    }

    await BookingPause.create({
      booking_id: booking.id,
      pause_from: pauseFromStr,
      pause_until: pauseUntilStr,
      pause_days: pauseDays,
      extended_end_date: newEndDate,
      reason: data.reason ?? null,
      paused_by: actor ? actor.id : null,
      paused_by_role: (actor.role && actor.role.slug) || null,
    }, { transaction: t });

    await booking.update({ status: 'paused' }, { transaction: t });
  });

  // Notify the assigned worker(s) - never let a notification failure break the response.
  try {
    const workerIds = H.bookingWorkerIds(booking);

    if (workerIds.length) {
      const tokens = await H.fcmTokensFor(workerIds);

      if (tokens.length) {
        await H.sendToMultiple(
          tokens,
          'Subscription Paused ⏸️',
          `Booking #${booking.id} has been paused by the customer from `
            + pauseFromStr + ' to ' + pauseUntilStr + '.',
          {
            type: 'subscription_paused',
            booking_id: String(booking.id),
            pause_from: pauseFromStr,
            pause_until: pauseUntilStr,
          }
        );
      }
    }
  } catch (e) {
    console.error('Subscription pause worker notification failed: ' + e.message);
  }

  // Admin-initiated pause: let the customer know too.
  if (adminInitiated) {
    try {
      const customerTokens = await H.fcmTokensFor([booking.customer_id]);

      if (customerTokens.length) {
        await H.sendToMultiple(
          customerTokens,
          'Subscription Paused ⏸️',
          `Your subscription for booking #${booking.id} has been paused from `
            + pauseFromStr + ' to ' + pauseUntilStr
            + '. Your plan end date has been extended by ' + pauseDays + ' days.',
          {
            type: 'subscription_paused',
            booking_id: String(booking.id),
            pause_from: pauseFromStr,
            pause_until: pauseUntilStr,
          }
        );
      }
    } catch (e) {
      console.error('Subscription pause customer notification failed: ' + e.message);
    }
  }

  const payload = {
    booking_id: booking.id,
    status: 'paused',
    pause_from: pauseFromStr,
    pause_until: pauseUntilStr,
    pause_days: pauseDays,
    new_subscription_end: newEndDate,
  };

  if (adminInitiated) {
    payload.paused_by = actor ? actor.id : null;
    payload.paused_by_name = actor.name ?? null;
    payload.paused_by_role = (actor.role && actor.role.slug) || null;
    payload.customer_id = booking.customer_id;
  }

  return res.json({
    success: true,
    message: 'Subscription paused successfully.',
    data: payload,
  });
}

// Customer manually resumes a paused subscription before pause_until.
async function resumeSubscription(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized access' });
  }

  if (booking.status !== 'paused') {
    return res.status(422).json({ success: false, message: 'Booking is not currently paused.' });
  }

  const activePause = await BookingPause.findOne({
    where: { booking_id: booking.id, resumed_at: null },
    order: [['created_at', 'DESC']],
  });

  if (!activePause) {
    return res.status(422).json({ success: false, message: 'No active pause record found.' });
  }

  await sequelize.transaction(async (t) => {
    await activePause.update({ resumed_at: new Date() }, { transaction: t });
    await booking.update({ status: 'confirmed' }, { transaction: t });
  });

  return res.json({
    success: true,
    message: 'Subscription resumed successfully.',
    data: {
      booking_id: booking.id,
      status: 'confirmed',
      resumed_at: dayjs().format(DT),
    },
  });
}

async function cancelSubscription(req, res) {
  const customer = req.user;
  const booking = await H.bindBooking(req);

  if (!H.sameId(booking.customer_id, customer.id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized access' });
  }

  const subscriptionService = await firstSubscriptionLine(booking);

  if (!subscriptionService) {
    return res.status(422).json({ success: false, message: 'This booking is not a monthly subscription.' });
  }

  if (booking.status === 'cancelled') {
    return res.status(422).json({ success: false, message: 'Booking is already cancelled.' });
  }

  const nonCancellableStatuses = ['completed', 'inprogress'];
  if (nonCancellableStatuses.includes(booking.status)) {
    return res.status(422).json({
      success: false,
      message: 'Booking cannot be cancelled in its current status (' + booking.status + ').',
    });
  }

  if (!subscriptionService.start_date) {
    return res.status(422).json({ success: false, message: 'Subscription start date not found.' });
  }

  // Cancellation allowed only after the first 2 days of the subscription.
  const subscriptionStart = dayjs(subscriptionService.start_date).startOf('day');
  const cancellationAfter = subscriptionStart.add(2, 'day').endOf('day');

  if (!dayjs().isAfter(cancellationAfter)) {
    return res.status(422).json({
      success: false,
      message: 'Cancellation is only allowed after 2 days of the subscription start date. Earliest cancellation date: '
        + cancellationAfter.add(1, 'second').format('YYYY-MM-DD'),
    });
  }

  const totalAmount = H.toFloat(booking.amount);
  let refundAmount = 0.0;
  let razorpayRefundId = null;
  let totalDays = 0;
  let usedDays = 0;
  let unusedDays = 0;

  // Pro-rata refund of the unused days (only when the booking was actually paid).
  if (booking.payment_status === Booking.PAYMENT_PAID) {
    if (!subscriptionService.end_date) {
      return res.status(422).json({ success: false, message: 'Subscription end date not found.' });
    }

    const today = dayjs().startOf('day');
    const startDate = dayjs(subscriptionService.start_date).startOf('day');
    const endDate = dayjs(subscriptionService.end_date).startOf('day');

    totalDays = Math.max(1, endDate.diff(startDate, 'day'));
    usedDays = Math.max(0, today.diff(startDate, 'day'));
    unusedDays = Math.max(0, totalDays - usedDays);

    const unusedRatio = unusedDays / totalDays;
    refundAmount = H.round2(totalAmount * unusedRatio);

    if (refundAmount > 0) {
      const paymentId = booking.razorpay_payment_id || booking.payment_ref;

      if (!paymentId) {
        return res.status(422).json({ success: false, message: 'Refund not possible: payment reference missing.' });
      }

      const key = config.razorpay.key;
      const secret = config.razorpay.secret;

      if (!key || !secret) {
        return res.status(500).json({ success: false, message: 'Payment provider not configured.' });
      }

      try {
        const razorpay = H.razorpayClient();
        const amountInPaise = Math.round(refundAmount * 100);

        const refund = await razorpay.payments.refund(paymentId, {
          amount: amountInPaise,
          speed: 'normal',
          notes: {
            booking_id: String(booking.id),
            reason: 'subscription_cancellation',
            unused_days: unusedDays,
            total_days: totalDays,
          },
          receipt: 'SUB_CANCEL_' + booking.id + '_' + Math.floor(Date.now() / 1000),
        });

        razorpayRefundId = (refund && refund.id) || null;
      } catch (e) {
        console.error('Razorpay subscription refund failed', {
          booking_id: booking.id,
          payment_id: paymentId,
          refund_amount: refundAmount,
          error: e && (e.message || (e.error && e.error.description)),
        });

        return res.status(502).json({
          success: false,
          message: 'Refund could not be processed. Please contact support.',
        });
      }
    }
  }

  let newPaymentStatus = booking.payment_status;
  if (booking.payment_status === Booking.PAYMENT_PAID && refundAmount > 0 && razorpayRefundId) {
    newPaymentStatus = Booking.PAYMENT_REFUNDED;
  }

  await sequelize.transaction(async (t) => {
    // Close any open pause so it no longer blocks anything.
    await BookingPause.update(
      { resumed_at: new Date() },
      { where: { booking_id: booking.id, resumed_at: null }, transaction: t }
    );

    await booking.update({
      status: 'cancelled',
      cancelled_at: new Date(),
      refund_amount: refundAmount,
      razorpay_refund_id: razorpayRefundId,
      payment_status: newPaymentStatus,
    }, { transaction: t });
  });

  return res.json({
    success: true,
    message: 'Subscription cancelled successfully.',
    data: {
      booking_id: booking.id,
      status: 'cancelled',
      cancelled_at: dayjs().format(DT),
      payment_status: newPaymentStatus,
      original_amount: totalAmount,
      total_days: totalDays,
      used_days: usedDays,
      unused_days: unusedDays,
      refund_amount: refundAmount,
      razorpay_refund_id: razorpayRefundId,
    },
  });
}

async function getPauseHistory(req, res) {
  const booking = await H.bindBooking(req);
  const user = req.user;
  const isAdmin = ['super-admin', 'co-ordinators'].includes((user.role && user.role.slug) || '');

  if (!isAdmin && !H.sameId(booking.customer_id, user.id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized access' });
  }

  return res.json({ success: true, data: await buildPauseHistoryPayload(booking) });
}

// Same payload as the customer endpoint, authorized by role + city.
async function adminPauseHistory(req, res) {
  const booking = await H.bindBooking(req);
  const actor = req.user;

  if (!canManageBookingAsAdmin(req, booking, actor)) {
    return res.status(403).json({
      success: false,
      message: 'This booking does not belong to your city.',
    });
  }

  return res.json({ success: true, data: await buildPauseHistoryPayload(booking) });
}

// Shared pause-history payload for the customer and admin endpoints.
async function buildPauseHistoryPayload(booking) {
  const subscriptionService = await firstSubscriptionLine(booking, true);

  const pauses = await BookingPause.findAll({
    where: { booking_id: booking.id },
    attributes: [
      'id', 'booking_id', 'pause_from', 'pause_until', 'pause_days', 'extended_end_date',
      'resumed_at', 'reason', 'paused_by', 'paused_by_role', 'created_at',
    ],
    include: [{ association: 'pausedBy', required: false, attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
  });

  const history = pauses.map((pause) => {
    const pausedByName = pause.pausedBy ? pause.pausedBy.name : null;
    const isCustomerPause = pause.paused_by === null || pause.paused_by === undefined
      || pause.paused_by_role === 'customers'
      || Number(pause.paused_by) === Number(booking.customer_id);

    return {
      id: pause.id,
      pause_from: H.dateStr(pause.pause_from),
      pause_until: H.dateStr(pause.pause_until),
      pause_days: pause.pause_days,
      extended_end_date: H.dateStr(pause.extended_end_date),
      resumed_at: H.dateTimeStr(pause.resumed_at),
      reason: pause.reason,
      status: pause.resumed_at ? 'resumed' : (
        dayjs().isAfter(dayjs(pause.pause_until).startOf('day')) ? 'auto-resumed' : 'active'
      ),
      created_at: H.dateTimeStr(pause.created_at),
      paused_by: pause.paused_by,
      paused_by_name: pausedByName,
      paused_by_role: pause.paused_by_role,
      paused_by_label: isCustomerPause ? 'Customer' : (pausedByName ?? 'Admin'),
    };
  });

  return {
    booking_id: booking.id,
    booking_status: booking.status,
    subscription_end: (subscriptionService && subscriptionService.end_date) ?? null,
    total_pauses: history.length,
    total_days_paused: history.reduce((sum, h) => sum + (Number(h.pause_days) || 0), 0),
    history,
  };
}

module.exports = {
  pauseSubscription, adminPauseSubscription, resumeSubscription, cancelSubscription,
  getPauseHistory, adminPauseHistory, applySubscriptionPause, canManageBookingAsAdmin, buildPauseHistoryPayload,
};
