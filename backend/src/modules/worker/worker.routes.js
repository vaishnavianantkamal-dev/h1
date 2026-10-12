// Routes for Api\Worker\{WorkerAuthController, WorkerProfileController, WorkerBookingResponseController,
// WorkerEmergencyAlertController} (routes/api.php). Mounted under /api by the loader.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const throttle = require('../../middleware/throttle');
const upload = require('../../middleware/upload');

const workerAuth = h(require('./workerAuth.controller'));
const workerProfile = h(require('./workerProfile.controller'));
const bookingResponse = h(require('./workerBookingResponse.controller'));
const emergencyAlert = h(require('./workerEmergencyAlert.controller'));

const router = express.Router();

// multipart routes: keep the original field names (id_front[1] ...) available as req.files[i].rawField
const recordFieldnames = (req, res, next) => {
  if (Array.isArray(req.files)) req.files.forEach((f) => { f.rawField = f.fieldname; });
  next();
};
const uploadAny = () => {
  const [any, normalise] = upload.any();
  return [any, recordFieldnames, normalise];
};

// ---- Route::middleware('auth:sanctum')->group (main group)
// Worker register
router.post('/worker/register', auth, uploadAny(), workerAuth.register);

router.get('/worker-bookings/:user?', auth, workerProfile.get_worker_bookings);
router.get('/worker/bookings', auth, workerProfile.getMyBookings);

// Available (claimable) bookings feed for the broadcast first-come-first-serve flow
router.get('/worker/available-bookings', auth, workerProfile.availableBookings);

// Worker accept / decline an assigned booking (admin-assigned flow)
router.post('/worker/bookingrequest/:booking/accept', auth, bookingResponse.accept);
router.post('/worker/bookingrequest/:booking/decline', auth, bookingResponse.decline);

// Worker claims a broadcast booking (first-come-first-serve dispatch)
router.post('/worker/bookingrequest/:booking/claim', auth, bookingResponse.claim);

// Worker rejects (dismisses) a broadcast booking from their own available feed
router.post('/worker/bookingrequest/:booking/reject', auth, bookingResponse.reject);

// Worker emergency / security (SOS) alert -> super-admin, city-admin, coordinators
router.post('/worker/emergency-alert', auth, emergencyAlert.store);
router.get('/worker/emergency-alerts', auth, emergencyAlert.history);

// ---- Route::middleware(['auth:sanctum', 'role:workers,contractors'])->group
router.get('/worker/me', auth, role('workers', 'contractors'), workerProfile.me);
router.post('/worker/profile/update', auth, role('workers', 'contractors'), workerProfile.update);
router.post('/worker/kyc/upload', auth, role('workers', 'contractors'), uploadAny(), workerProfile.uploadKyc);

// NOTE: registered OUTSIDE the group above in routes/api.php, i.e. with no middleware at all
router.get('/worker/referrals', workerProfile.myReferrals);

// Worker app register (public)
router.post('/worker/register_app', uploadAny(), workerAuth.registerApp);

// ---- prefix('admin') + auth:sanctum + role:super-admin,city-admin,co-ordinators,operation-head,contractors,staff,workers
const adminPrefix = [auth, role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'contractors', 'staff', 'workers')];
// Route::match(['post', 'put'], '/worker/{user?}/update', ...)
router.post('/admin/worker/:user/update', ...adminPrefix, uploadAny(), workerAuth.update);
router.put('/admin/worker/:user/update', ...adminPrefix, uploadAny(), workerAuth.update);
router.delete('/admin/worker/:user', ...adminPrefix, workerAuth.destroy);

// ---- uploade kyc: auth:sanctum + role:super-admin,city-admin,co-ordinators,operation-head,workers,contractors,staff
router.post(
  '/worker/:user/docs',
  auth,
  role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'workers', 'contractors', 'staff'),
  uploadAny(),
  workerProfile.uploaddocs,
);

// ---- Route::prefix('worker')
router.post('/worker/login/send-otp', throttle.otp, workerAuth.sendWorkerOtp);
router.post('/worker/login/verify-otp', workerAuth.verifyWorkerOtp);
router.post('/worker/login/password', workerAuth.loginWithPassword);

// ---- Mobile app: save FCM token for push notifications (auth:sanctum)
router.post('/user/fcm-token', auth, workerAuth.updateFcmToken);

module.exports = router;
