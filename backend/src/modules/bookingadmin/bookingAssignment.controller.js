// Port of App\Http\Controllers\Admin\BookingAssignmentController
// (the unrouted legacy assign_old() is not ported). Booking\BookingAssignmentController is not routed anywhere.
const { Op } = require('sequelize');
const { Booking, User, Role, UserFcmToken } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const { jsonContains, instanceOf, cleanIntIds, sequelize } = require('./_helpers');

const FMT = 'YYYY-MM-DD HH:mm:ss';
const firebase = () => instanceOf(require('../../services/FirebaseService'));

const NOT_DONE = ['cancelled', 'completed'];

// Laravel `$request->worker_ids` style raw input
function resolveWorkerIds(req) {
  let ids = [];
  const wids = req.input('worker_ids');

  if (req.filled('worker_ids') && Array.isArray(wids)) {
    // Multiple workers: [99, 100]
    ids = wids;
  } else if (req.filled('worker_ids') && wids !== null && wids !== '' && !isNaN(Number(wids))) {
    // worker_ids sent as single number instead of array
    ids = [parseInt(wids, 10)];
  } else if (req.filled('worker_id')) {
    // Legacy single worker_id
    ids = [req.input('worker_id')];
  }

  // Always return clean unique int array
  return cleanIntIds(ids);
}

const assignRules = {
  booking_id: 'required|exists:bookings,id',
  worker_id: 'nullable|exists:users,id',
  worker_ids: 'nullable|array|min:1',
  'worker_ids.*': 'exists:users,id',
};

async function roleId(slug) {
  const r = await Role.findOne({ where: { slug }, attributes: ['id'] });
  return r ? r.id : null;
}

async function validWorkerIdsOf(workerIds) {
  const workerRoleId = await roleId('workers');
  const rows = await User.findAll({
    where: { id: workerIds, role_id: workerRoleId, is_active: 1 },
    attributes: ['id'],
  });
  return rows.map((r) => Number(r.id));
}

async function fcmTokensFor(userIds) {
  const rows = await UserFcmToken.findAll({ where: { user_id: userIds }, attributes: ['fcm_token'] });
  return rows.map((r) => r.fcm_token);
}

async function freeWorkerIfIdle(wid, excludeBookingId) {
  const where = { worker_id: wid, status: { [Op.notIn]: NOT_DONE } };
  if (excludeBookingId) where.id = { [Op.ne]: excludeBookingId };
  const stillAssigned = !!(await Booking.findOne({ where, attributes: ['id'] }));
  if (!stillAssigned) await User.update({ is_assigned: 0 }, { where: { id: wid } });
}

// Split a time_slot string into [start, end] in 24h "H:i" format.
// Accepts a single time ("11:00 AM", assumed 1-hour duration) or a range ("11:00 AM-1:00 PM").
function parseTimeSlot(timeSlot) {
  let ts = String(timeSlot ?? '').replace(/_/g, ' ').trim();
  ts = ts.replace(/–/g, '-');

  const to24 = (h, m, ap) => {
    h = parseInt(h, 10);
    if (ap) {
      if (h < 1 || h > 12) throw new Error('Invalid time slot format');
      h = (h % 12) + (ap === 'PM' ? 12 : 0);
    } else if (h > 23) throw new Error('Invalid time slot format');
    if (parseInt(m, 10) > 59) throw new Error('Invalid time slot format');
    return { h, m: parseInt(m, 10) };
  };
  const fmt = ({ h, m }) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  if (!ts.includes('-')) {
    let t;
    let mt = ts.match(/^(\d{1,2}):(\d{2})$/);
    if (mt) t = to24(mt[1], mt[2]);
    else {
      mt = ts.toUpperCase().match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
      if (!mt) throw new Error('Invalid time slot format');
      t = to24(mt[1], mt[2], mt[3]);
    }
    return [fmt(t), fmt({ h: (t.h + 1) % 24, m: t.m })];
  }

  const idx = ts.indexOf('-');
  const start = ts.slice(0, idx).trim();
  const end = ts.slice(idx + 1).trim();
  const p = (s) => {
    const mt = s.toUpperCase().match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
    if (!mt) throw new Error('Invalid time slot format');
    return fmt(to24(mt[1], mt[2], mt[3]));
  };
  return [p(start), p(end)];
}

const BookingAssignmentController = {
  // POST /admin/assign-booking   (also POST /admin/assign-booking via the admin prefix group: /assign-booking)
  async assign(req, res) {
    await validate(req, assignRules);

    const workerIds = resolveWorkerIds(req);

    if (!workerIds.length) {
      return res.status(422).json({ success: false, message: 'Provide worker_id or worker_ids.' });
    }

    const validWorkers = await validWorkerIdsOf(workerIds);
    const invalidIds = workerIds.filter((id) => !validWorkers.includes(id));

    if (invalidIds.length) {
      return res.status(422).json({
        success: false,
        message: 'Some worker IDs are invalid or inactive.',
        invalid_ids: invalidIds,
      });
    }

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.payment_status !== 'paid') {
      return res.status(422).json({
        success: false,
        message: 'Booking cannot be assigned. Payment is not completed.',
      });
    }

    // Check who is assigning
    const authUser = req.user;
    const coordinatorRoleId = await roleId('co-ordinators');
    const isCoordinator = coordinatorRoleId !== null && Number(authUser.role_id) === Number(coordinatorRoleId);

    const primaryWorkerId = workerIds[0];

    // If coordinator is assigning, add them to coordinator_ids
    let coordinatorIds = booking.coordinator_ids || [];
    if (typeof coordinatorIds === 'string') {
      try { coordinatorIds = JSON.parse(coordinatorIds) || []; } catch (e) { coordinatorIds = []; }
    }
    coordinatorIds = [...coordinatorIds];

    if (isCoordinator && !coordinatorIds.includes(authUser.id)) {
      coordinatorIds.push(authUser.id);
    }

    const now = dayjs().format(FMT);
    await booking.update({
      worker_id: primaryWorkerId,
      worker_ids: cleanIntIds(workerIds),
      coordinator_ids: coordinatorIds.length ? cleanIntIds(coordinatorIds) : null,
      assigned_by: authUser.id,
      status: 'assigned',
      // (is_assigned is not in Booking::$fillable, so Laravel silently dropped it)
      // Direct assignment: no worker accept/decline step.
      acceptance_status: 'accepted',
      acceptance_requested_at: now,
      accepted_at: now,
      declined_at: null,
      decline_reason: null,
    });

    await User.update({ is_assigned: 1 }, { where: { id: workerIds } });

    console.log('Booking assigned to workers', {
      booking_id: booking.id,
      worker_ids: workerIds,
      assigned_by: authUser.id,
      assigned_by_role: isCoordinator ? 'coordinator' : 'admin',
    });

    // FCM Notification
    const workers = await User.findAll({ where: { id: workerIds }, attributes: ['id', 'name', 'phone', 'fcm_token'] });
    const fcmTokens = await fcmTokensFor(workerIds);

    firebase().requireMessaging(); // PHP: new FirebaseService(app(Messaging::class)) throws without credentials
    await firebase().sendToMultiple(
      fcmTokens,
      'New Service Assigned',
      `You have been assigned to booking #${booking.id}.`,
      {
        booking_id: String(booking.id),
        type: 'booking_assigned',
        // Direct assignment: no Accept/Decline step for the worker.
        requires_response: 'false',
        acceptance_status: 'accepted',
      },
    );

    // Coordinator info (who assigned)
    const assignedByCoordinator = isCoordinator
      ? { id: authUser.id, name: authUser.name, phone: authUser.phone }
      : null;

    // All coordinators on this booking
    const fresh = await Booking.findByPk(booking.id);
    const freshCoordinatorIds = fresh.coordinator_ids || [];
    const coordinators = freshCoordinatorIds.length
      ? await User.findAll({ where: { id: freshCoordinatorIds }, attributes: ['id', 'name', 'phone'] })
      : [];

    return res.json({
      success: true,
      message: workerIds.length > 1
        ? `${workerIds.length} workers assigned successfully.`
        : 'Worker assigned successfully.',
      booking_id: booking.id,
      assigned_by: isCoordinator ? 'coordinator' : 'admin',
      assigned_by_coordinator: assignedByCoordinator,
      coordinators,
      workers,
    });
  },

  // POST /admin/reassign-booking
  async reassign(req, res) {
    await validate(req, assignRules);

    const workerIds = resolveWorkerIds(req);

    if (!workerIds.length) {
      return res.status(422).json({ success: false, message: 'Provide worker_id or worker_ids.' });
    }

    const booking = await findOrFail(Booking, req.input('booking_id'));

    // Free old workers. Fallback: if worker_ids is null but worker_id exists (old single assign)
    let oldWorkerIds = booking.worker_ids || [];
    if (!oldWorkerIds.length && booking.worker_id) oldWorkerIds = [booking.worker_id];

    for (const wid of oldWorkerIds) {
      await freeWorkerIfIdle(wid, booking.id);
    }

    // Validate new workers
    const validWorkers = await validWorkerIdsOf(workerIds);
    const invalidIds = workerIds.filter((id) => !validWorkers.includes(id));

    if (invalidIds.length) {
      return res.status(422).json({
        success: false,
        message: 'Some worker IDs are invalid or inactive.',
        invalid_ids: invalidIds,
      });
    }

    // Assign new workers
    const primaryWorkerId = workerIds[0];
    const now = dayjs().format(FMT);

    await booking.update({
      worker_id: primaryWorkerId,
      worker_ids: cleanIntIds(workerIds),
      assigned_by: req.user.id,
      status: 'assigned',
      // Direct assignment: reassigned worker(s) are considered accepted immediately.
      acceptance_status: 'accepted',
      acceptance_requested_at: now,
      accepted_at: now,
      declined_at: null,
      decline_reason: null,
    });

    await User.update({ is_assigned: 1 }, { where: { id: workerIds } });

    console.log('Booking reassigned to workers', {
      booking_id: booking.id,
      worker_ids: workerIds,
      assigned_by: req.user.id,
    });

    const workers = await User.findAll({ where: { id: workerIds }, attributes: ['id', 'name', 'phone', 'fcm_token'] });
    const fcmTokens = await fcmTokensFor(workerIds);

    firebase().requireMessaging(); // PHP: new FirebaseService(app(Messaging::class)) throws without credentials
    await firebase().sendToMultiple(
      fcmTokens,
      'New Service Assigned',
      `You have been assigned to booking #${booking.id}.`,
      {
        booking_id: String(booking.id),
        type: 'booking_assigned',
        requires_response: 'false',
        acceptance_status: 'accepted',
      },
    );

    return res.json({
      success: true,
      message: workerIds.length > 1
        ? `${workerIds.length} workers reassigned successfully.`
        : 'Worker reassigned successfully.',
      booking_id: booking.id,
      workers,
    });
  },

  // POST /admin/unassign-booking
  async unassign(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      worker_id: 'nullable|exists:users,id',
    });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (req.filled('worker_id')) {
      const removeId = parseInt(req.input('worker_id'), 10);
      const currentIds = booking.worker_ids || [];
      const updatedIds = currentIds.filter((id) => id !== removeId);

      const newPrimary = updatedIds.length ? updatedIds[0] : null;

      await booking.update({
        worker_id: newPrimary,
        worker_ids: updatedIds.length ? updatedIds : null,
        status: updatedIds.length ? booking.status : 'pending',
        // (is_assigned is not in Booking::$fillable, so Laravel silently dropped it)
      });

      await freeWorkerIfIdle(removeId, null);

      return res.json({
        success: true,
        message: 'Worker removed from booking.',
        remaining_count: updatedIds.length,
      });
    }

    const oldWorkerIds = booking.worker_ids || [];

    await booking.update({ worker_id: null, worker_ids: null, status: 'pending' });

    for (const wid of oldWorkerIds) {
      await freeWorkerIfIdle(wid, null);
    }

    return res.json({ success: true, message: 'All workers unassigned from booking.' });
  },

  // GET /admin/booking/{booking}/workers
  async assignedWorkers(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);
    const workerIds = booking.worker_ids || [];

    if (!workerIds.length) {
      return res.json({ success: true, booking_id: booking.id, workers: [] });
    }

    const workers = await User.findAll({
      where: { id: workerIds },
      attributes: ['id', 'name', 'phone', 'is_active', 'is_assigned'],
    });

    return res.json({ success: true, booking_id: booking.id, workers });
  },

  // GET /admin/booking/{booking}/previous-workers
  // Workers who served this booking's customer earlier, filtered to those eligible/available for THIS booking.
  async previousWorkers(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);

    const bookings = await Booking.findAll({
      where: {
        customer_id: booking.customer_id,
        id: { [Op.ne]: booking.id },
        [Op.or]: [{ worker_id: { [Op.ne]: null } }, { worker_ids: { [Op.ne]: null } }],
      },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'worker_id', 'worker_ids', 'created_at'],
    });

    // Collapse worker_id + worker_ids into a distinct set, tracking count + most recent assignment.
    const stats = {};
    for (const b of bookings) {
      const ids = [...new Set([b.worker_id, ...(b.worker_ids || [])].filter(Boolean).map((i) => parseInt(i, 10)))];

      for (const id of ids) {
        if (!stats[id]) stats[id] = { count: 0, last_assigned_at: b.created_at };
        stats[id].count += 1;
        // Bookings are ordered newest-first, so the first hit is latest.
        if (dayjs(b.created_at).isAfter(dayjs(stats[id].last_assigned_at))) {
          stats[id].last_assigned_at = b.created_at;
        }
      }
    }

    if (!Object.keys(stats).length) {
      return res.json({
        success: true,
        booking_id: booking.id,
        customer_id: booking.customer_id,
        workers: [],
      });
    }

    // Only offer previous workers who are eligible/available for THIS booking.
    let bookingStart;
    let bookingEnd;
    try {
      [bookingStart, bookingEnd] = parseTimeSlot(booking.time_slot);
    } catch (e) {
      return res.status(422).json({ message: 'Invalid time slot format', time_slot: booking.time_slot });
    }

    const esc = (v) => sequelize.escape(v);
    const conds = [
      { id: Object.keys(stats).map(Number) },
      jsonContains('User.service_ids', parseInt(booking.service_id, 10)),
      { is_active: 1 },
      sequelize.literal(
        `NOT EXISTS (SELECT 1 FROM bookings AS bk WHERE bk.worker_id = \`User\`.\`id\``
        + ` AND bk.booking_date = ${esc(booking.booking_date)}`
        + ` AND bk.status NOT IN ('cancelled')`
        + ` AND (SUBSTRING_INDEX(bk.time_slot, '-', 1) < ${esc(bookingEnd)}`
        + ` AND SUBSTRING_INDEX(bk.time_slot, '-', -1) > ${esc(bookingStart)}))`,
      ),
    ];
    if (booking.city_id) conds.push({ city_id: booking.city_id });

    const found = await User.findAll({
      where: { [Op.and]: conds },
      attributes: ['id', 'name', 'phone', 'is_active', 'is_assigned'],
    });

    const workers = found
      .map((w) => ({
        ...w.toJSON(),
        times_assigned: stats[w.id].count,
        last_assigned_at: stats[w.id].last_assigned_at,
      }))
      .sort((a, b) => new Date(b.last_assigned_at) - new Date(a.last_assigned_at));

    return res.json({
      success: true,
      booking_id: booking.id,
      customer_id: booking.customer_id,
      workers,
    });
  },
};

module.exports = BookingAssignmentController;
