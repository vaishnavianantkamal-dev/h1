// Port of App\Http\Controllers\Api\Worker\WorkerBookingResponseController
//
// Worker accept / decline of an assigned booking, plus claim / reject of broadcast bookings.
const { Op } = require('sequelize');
const { Booking, Role, User, UserFcmToken, sequelize } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');

const now = () => dayjs().toDate();
const ints = (arr) => (Array.isArray(arr) ? arr : []).map((v) => parseInt(v, 10) || 0);
const required = (booking) => parseInt(booking.workers, 10) || 1;

// Resolve FirebaseNotificationService (singleton or class) lazily so a missing push config never breaks requests.
function notificationService() {
  const S = require('../../services/FirebaseNotificationService');
  return typeof S === 'function' ? new S() : S;
}
function firebaseService() {
  const S = require('../../services/FirebaseService');
  return typeof S === 'function' ? new S() : S;
}

/**
 * Is the user an active worker eligible to claim this booking?
 * Active worker role, and (if the booking has a city) in the same city.
 */
async function workerIsEligible(user, booking) {
  if (!user) return false;

  const workerRole = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
  const workerRoleId = workerRole ? workerRole.id : null;

  if (!workerRoleId || Number(user.role_id) !== Number(workerRoleId)) return false;

  // City scoping: only enforce when the booking has a resolved city.
  if (booking.city_id && Number(user.city_id) !== Number(booking.city_id)) return false;

  return true;
}

/**
 * Is the authenticated worker assigned to this booking?
 * Checks both the primary worker_id and the worker_ids JSON array.
 */
function workerOwnsBooking(user, booking) {
  if (!user) return false;
  if (Number(booking.worker_id) === Number(user.id)) return true;
  return ints(booking.worker_ids).includes(Number(user.id));
}

// Notify the admin/coordinator who assigned the booking (FCM push only).
async function notifyAssigner(booking, worker, type, title, body) {
  const assignerId = booking.assigned_by;

  if (!assignerId) {
    console.log('Accept/Decline notification SKIPPED - booking has no assigner (assigned_by null)', {
      booking_id: booking.id, worker_id: worker.id, type,
    });
    return;
  }

  // Push notification
  const fcmTokens = (await UserFcmToken.findAll({ where: { user_id: assignerId }, attributes: ['fcm_token'] })).map((r) => r.fcm_token);

  if (!fcmTokens.length) {
    console.log('Accept/Decline push NOT SENT - assigner has no FCM tokens', {
      booking_id: booking.id, assigner_id: assignerId, type,
    });
    return;
  }

  try {
    await firebaseService().sendToMultiple(fcmTokens, title, body, {
      booking_id: String(booking.id),
      worker_id: String(worker.id),
      type,
    });

    console.log('Accept/Decline push SENT to assigner', {
      booking_id: booking.id, assigner_id: assignerId, worker_id: worker.id, type, token_count: fcmTokens.length,
    });
  } catch (e) {
    // Never let a push failure break the worker's response.
    console.warn('Accept/Decline push FAILED to send to assigner', {
      booking_id: booking.id, assigner_id: assignerId, type, error: e.message,
    });
  }
}

const ctrl = {
  /**
   * POST /worker/bookingrequest/{booking}/claim
   * First-come-first-serve claim for a BROADCAST booking (slot based, row-locked).
   */
  async claim(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);
    const user = req.user;

    // Eligibility: must be an active worker in the booking's city
    if (!(await workerIsEligible(user, booking))) {
      return res.status(403).json({ success: false, message: 'You are not eligible to claim this booking.' });
    }

    let outcome = null; // 'claimed' | 'full' | 'duplicate' | 'full_now'

    await sequelize.transaction(async (t) => {
      const locked = await Booking.findByPk(booking.id, { lock: t.LOCK.UPDATE, transaction: t });
      const req_ = required(locked);
      const ids = ints(locked.worker_ids);

      // Already in the list -> this worker has already claimed a slot.
      if (ids.includes(Number(user.id))) {
        outcome = 'duplicate';
        return;
      }

      // No slots left.
      if (ids.length >= req_) {
        outcome = 'full';
        return;
      }

      ids.push(Number(user.id));
      locked.worker_ids = ids; // array cast re-encodes
      locked.worker_id = locked.worker_id || user.id; // primary on first claim
      locked.assigned_by = locked.assigned_by || user.id; // self-claimed
      locked.status = 'assigned'; // first claim flips it
      locked.acceptance_status = 'accepted';
      locked.acceptance_requested_at = locked.acceptance_requested_at || now();
      locked.accepted_at = now();
      locked.declined_at = null;
      locked.decline_reason = null;
      await locked.save({ transaction: t });

      // Full once this claim fills the final slot.
      outcome = ids.length >= req_ ? 'full_now' : 'claimed';
    });

    if (outcome === 'duplicate') {
      return res.status(409).json({ success: false, message: 'You have already claimed this booking.' });
    }

    if (outcome === 'full') {
      return res.status(409).json({ success: false, message: 'This booking is already fully assigned.' });
    }

    // Mark the winning worker as assigned globally.
    await User.update({ is_assigned: 1 }, { where: { id: user.id } });

    await booking.reload();

    const isFull = outcome === 'full_now';

    console.log('Worker claimed booking slot (first-come-first-serve)', {
      booking_id: booking.id,
      worker_id: user.id,
      city_id: booking.city_id,
      slots_filled: (booking.worker_ids || []).length,
      slots_required: required(booking),
      is_full: isFull,
    });

    // Notify. Only tell the other city workers it's gone once every slot is filled;
    // while slots remain it must stay in their available feed.
    try {
      const notifier = notificationService();

      if (isFull) await notifier.sendBookingTakenToWorkers(booking.id, booking.city_id, user.id);

      if (booking.customer_id) await notifier.sendBookingStatusChanged(booking.id, 'assigned', booking.customer_id);
    } catch (e) {
      // Never let a push failure undo a successful claim.
      console.warn('Post-claim notifications failed', { booking_id: booking.id, error: e.message });
    }

    return res.json({
      success: true,
      message: isFull
        ? 'Booking claimed successfully. All worker slots are now filled.'
        : 'Booking slot claimed successfully. More workers can still join.',
      booking_id: booking.id,
      status: booking.status,
      acceptance_status: booking.acceptance_status,
      slots_filled: (booking.worker_ids || []).length,
      slots_required: required(booking),
      is_full: isFull,
    });
  },

  /**
   * POST /worker/bookingrequest/{booking}/reject
   * Per-worker dismissal of a BROADCAST booking: hides it from THIS worker's feed only.
   */
  async reject(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);
    const user = req.user;

    // Must be an active worker in the booking's city (same rule as claim).
    if (!(await workerIsEligible(user, booking))) {
      return res.status(403).json({ success: false, message: 'You are not eligible to reject this booking.' });
    }

    // A booking this worker has already claimed a slot in can't be rejected;
    // it already leaves their feed via the slots-filled filter.
    if (ints(booking.worker_ids).includes(Number(user.id))) {
      return res.status(409).json({
        success: false,
        message: 'You have already claimed this booking and cannot reject it.',
      });
    }

    // Append this worker to the rejected list (deduped). A row lock inside a transaction
    // serialises concurrent rejects so no id is lost.
    await sequelize.transaction(async (t) => {
      const locked = await Booking.findByPk(booking.id, { lock: t.LOCK.UPDATE, transaction: t });
      const rejected = ints(locked.rejected_worker_ids);

      if (!rejected.includes(Number(user.id))) {
        rejected.push(Number(user.id));
        locked.rejected_worker_ids = rejected;
        await locked.save({ transaction: t });
      }
    });

    console.log('Worker rejected (dismissed) broadcast booking from their feed', {
      booking_id: booking.id, worker_id: user.id,
    });

    return res.json({
      success: true,
      message: 'Booking removed from your available list.',
      booking_id: booking.id,
    });
  },

  /** POST /worker/bookingrequest/{booking}/accept */
  async accept(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);
    const user = req.user;

    if (!workerOwnsBooking(user, booking)) {
      return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
    }

    if (booking.acceptance_status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This request can no longer be accepted.',
        acceptance_status: booking.acceptance_status,
      });
    }

    await booking.update({
      acceptance_status: 'accepted',
      accepted_at: now(),
      declined_at: null,
      decline_reason: null,
    });

    console.log('Worker accepted booking', { booking_id: booking.id, worker_id: user.id });

    await notifyAssigner(booking, user, 'booking_accepted', 'Request Accepted', `${user.name} accepted booking #${booking.id}.`);

    return res.json({
      success: true,
      message: 'Booking accepted.',
      booking_id: booking.id,
      acceptance_status: 'accepted',
    });
  },

  /** POST /worker/bookingrequest/{booking}/decline */
  async decline(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);

    await validate(req, { reason: 'nullable|string|max:255' });

    const user = req.user;

    if (!workerOwnsBooking(user, booking)) {
      return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
    }

    if (booking.acceptance_status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This request can no longer be declined.',
        acceptance_status: booking.acceptance_status,
      });
    }

    // Remove this worker from the booking (same logic as admin unassign)
    const currentIds = booking.worker_ids || [];
    const updatedIds = currentIds.filter((id) => Number(id) !== Number(user.id));

    const newPrimary = updatedIds.length ? updatedIds[0] : null;

    await booking.update({
      worker_id: newPrimary,
      worker_ids: updatedIds.length ? updatedIds : null,
      // If no workers remain, the booking goes back to 'pending' for reassignment
      // (mirrors the existing unassign behaviour). Otherwise status is left as-is.
      status: updatedIds.length ? booking.status : 'pending',
      is_assigned: updatedIds.length > 0,
      acceptance_status: 'declined',
      declined_at: now(),
      decline_reason: req.input('reason'),
    });

    // Free this worker's global is_assigned flag if they have no other active booking.
    const stillAssigned = await Booking.findOne({
      where: { worker_id: user.id, id: { [Op.ne]: booking.id }, status: { [Op.notIn]: ['cancelled', 'completed'] } },
      attributes: ['id'],
    });

    if (!stillAssigned) await User.update({ is_assigned: 0 }, { where: { id: user.id } });

    console.log('Worker declined booking', { booking_id: booking.id, worker_id: user.id, reason: req.input('reason') });

    await notifyAssigner(booking, user, 'booking_declined', 'Request Declined', `${user.name} declined booking #${booking.id}. Please reassign.`);

    return res.json({
      success: true,
      message: 'Booking declined.',
      booking_id: booking.id,
      acceptance_status: 'declined',
    });
  },
};

module.exports = ctrl;
