// Port of App\Http\Controllers\Api\TrackingController (Firebase RTDB "On My Way" live tracking)
const crypto = require('crypto');
const { Booking, TrackingSession, User } = require('../../models');
const { validate } = require('../../utils/validate');
const FirebaseNotificationService = require('../../services/FirebaseNotificationService');
const firebaseRtdb = require('./firebaseRtdb');
const FirebaseService = require('../../services/FirebaseService');

const driverPath = (workerId) => `drivers/${workerId}`;

// Str::random(n) - alphanumeric
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const strRandom = (n) => {
  let out = '';
  while (out.length < n) {
    for (const b of crypto.randomBytes(n * 2)) {
      if (b < 248 && out.length < n) out += ALNUM[b % 62];
    }
  }
  return out;
};

// Mirrors the existing pattern: worker_id == user->id OR in worker_ids[].
function workerOwnsBooking(user, booking) {
  if (Number(booking.worker_id) === Number(user.id)) return true;
  let ids = booking.worker_ids || [];
  if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
  if (!Array.isArray(ids)) ids = Object.values(ids || {});
  return ids.map((v) => parseInt(v, 10)).includes(Number(user.id));
}

const destination = (booking) => ({
  latitude: booking.latitude !== null && booking.latitude !== undefined ? parseFloat(booking.latitude) : null,
  longitude: booking.longitude !== null && booking.longitude !== undefined ? parseFloat(booking.longitude) : null,
  address: booking.address,
});

module.exports = {
  // POST /tracking/start (worker, auth)
  async start(req, res) {
    // method injection (FirebaseAuth, FirebaseNotificationService) throws before the action runs when Firebase is not configured
    FirebaseService.requireNotificationService();
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const user = req.user;
    const booking = await Booking.findByPk(req.input('booking_id'));

    if (!workerOwnsBooking(user, booking)) {
      return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
    }

    // Reuse an already-active session for this booking (idempotent), otherwise create a fresh one.
    let session = await TrackingSession.findOne({ where: { booking_id: booking.id, active: true } });

    if (!session) {
      session = await TrackingSession.create({
        booking_id: booking.id,
        worker_id: user.id,
        token: strRandom(48),
        active: true,
      });
    }

    // Firebase custom token: lets the worker app WRITE only its own node.
    let customToken;
    try {
      customToken = await firebaseRtdb.createCustomToken(String(user.id), {
        role: 'worker',
        worker_id: String(user.id),
      });
    } catch (e) {
      console.error('tracking.start: custom token failed', { error: e.message });
      return res.status(500).json({ success: false, message: 'Could not start tracking. Please try again.' });
    }

    // One-time "your worker is on the way" push to the customer. Non-fatal if it fails.
    try {
      if (booking.customer_id) {
        await FirebaseNotificationService.sendWorkerLocationUpdate(booking.id, booking.customer_id);
      }
    } catch (e) {
      console.warn('tracking.start: notify failed', { error: e.message });
    }

    return res.json({
      success: true,
      message: 'Tracking started.',
      booking_id: booking.id,
      worker_id: Number(user.id),
      firebase_custom_token: customToken, // worker app signs in with this
      driver_path: driverPath(user.id), // where to write GPS
    });
  },

  // GET /tracking/{booking_id} (customer, auth)
  async show(req, res) {
    // method injection (FirebaseAuth) throws before the action runs when Firebase is not configured
    FirebaseService.requireMessaging();
    const user = req.user;
    const booking = await Booking.findByPk(req.params.booking_id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Only the booking's own customer may watch.
    if (Number(booking.customer_id) !== Number(user.id)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to track this booking.' });
    }

    const session = await TrackingSession.findOne({
      where: { booking_id: booking.id, active: true },
      order: [['id', 'DESC']],
    });

    // Worker has not tapped "On My Way" yet - nothing to show.
    if (!session) {
      return res.json({
        success: true,
        tracking: false,
        message: 'Worker has not started sharing location yet.',
        destination: destination(booking),
      });
    }

    const workerId = Number(session.worker_id);

    // Firebase custom token: lets the customer app READ this worker's node.
    let customToken;
    try {
      customToken = await firebaseRtdb.createCustomToken(String(user.id), {
        role: 'customer',
        watch: String(workerId),
      });
    } catch (e) {
      console.error('tracking.show: custom token failed', { error: e.message });
      return res.status(500).json({ success: false, message: 'Could not open tracking. Please try again.' });
    }

    const worker = booking.worker_id ? await User.findByPk(booking.worker_id) : null;

    return res.json({
      success: true,
      tracking: true,
      booking_id: booking.id,
      worker_id: workerId,
      worker: { name: worker ? worker.name : null },
      firebase_custom_token: customToken, // customer app signs in with this
      driver_path: driverPath(workerId), // node to listen on
      destination: destination(booking),
    });
  },

  // POST /tracking/stop (worker, auth)
  async stop(req, res) {
    // method injection (FirebaseDatabase) throws before the action runs when Firebase is not configured
    FirebaseService.requireMessaging();
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const user = req.user;

    const session = await TrackingSession.findOne({
      where: { booking_id: req.input('booking_id'), worker_id: user.id, active: true },
      order: [['id', 'DESC']],
    });

    if (session) await session.update({ active: false, ended_at: new Date() });

    // Only wipe the worker's live node if they have nothing else running.
    const stillActive = await TrackingSession.findOne({ where: { worker_id: user.id, active: true } });

    if (!stillActive) {
      try {
        await firebaseRtdb.removeReference(driverPath(user.id));
      } catch (e) {
        console.warn('tracking.stop: rtdb remove failed', { error: e.message });
      }
    }

    return res.json({ success: true, message: 'Tracking stopped.' });
  },
};
