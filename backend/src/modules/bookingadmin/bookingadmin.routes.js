// Routes for: AdminBookingController, Admin\BookingAssignmentController, CoordinatorAssignmentController,
// BookingApprovalController, BookingAlertController, ServiceEndAlertController, DashBoardController,
// AdminEmergencyAlertController  (routes/api.php; mounted at /api).
// Middleware is applied per route (never router.use) so it cannot swallow other modules' routes.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');

const adminBooking = require('./adminBooking.controller');
const bookingAssignment = require('./bookingAssignment.controller');
const coordinatorAssignment = require('./coordinatorAssignment.controller');
const bookingApproval = require('./bookingApproval.controller');
const bookingAlert = require('./bookingAlert.controller');
const serviceEndAlert = require('./serviceEndAlert.controller');
const dashboard = require('./dashboard.controller');
const adminEmergencyAlert = require('./adminEmergencyAlert.controller');

const { Booking } = require('../../models');
const { findOrFail } = require('../../utils/binding');

// Laravel runs SubstituteBindings (route-model binding -> 404) BEFORE the non-prioritised role middleware,
// so a missing {booking} gives 404 even for a role that would otherwise be refused with 403 (auth still runs first).
const bindBooking = h(async (req, res, next) => { await findOrFail(Booking, req.params.booking); next(); });

// auth (Authenticate) -> binding -> role
const withBind = (mw) => [mw[0], bindBooking, ...mw.slice(1)];

const router = express.Router();

// ---- Route::middleware('auth:sanctum')->group(...) -------------------------------------------
// Dashboard
router.get('/overview', auth, h(dashboard.overview));

// Admin service-end alerts (scoped to the logged-in admin)
router.get('/admin/service-end-alerts', auth, h(serviceEndAlert.index));
router.get('/admin/service-end-alerts/unread-count', auth, h(serviceEndAlert.unreadCount));
router.put('/admin/service-end-alerts/read/:id', auth, h(serviceEndAlert.markAsRead));
router.put('/admin/service-end-alerts/read-all', auth, h(serviceEndAlert.markAllAsRead));

// Responder side of the SOS flow  (auth:sanctum + role:super-admin,city-admin,co-ordinators)
const sos = [auth, role('super-admin', 'city-admin', 'co-ordinators')];
router.get('/admin/emergency-alerts', sos, h(adminEmergencyAlert.index));
router.get('/admin/emergency-alerts/:alert', sos, h(adminEmergencyAlert.show));
router.post('/admin/emergency-alerts/:alert/acknowledge', sos, h(adminEmergencyAlert.acknowledge));
router.post('/admin/emergency-alerts/:alert/resolve', sos, h(adminEmergencyAlert.resolve));

// ---- auth:sanctum + role:super-admin,city-admin,contractors,co-ordinators ---------------------
const assigners = [auth, role('super-admin', 'city-admin', 'contractors', 'co-ordinators')];

// Booking assignment (multi-worker support)
// NB: routes/api.php declares POST /admin/assign-booking twice (here and, via prefix('admin'), as /assign-booking in the wide
// role group further down). The later registration replaces the earlier one in Laravel's route collection, so the LIVE
// middleware is the wide adminPrefix role list - registered below next to reassign-booking.
router.post('/admin/unassign-booking', assigners, h(bookingAssignment.unassign));
router.get('/admin/booking/:booking/workers', withBind(assigners), h(bookingAssignment.assignedWorkers));
router.get('/admin/booking/:booking/previous-workers', withBind(assigners), h(bookingAssignment.previousWorkers));

router.post('/admin/assign-coordinator', assigners, h(coordinatorAssignment.assign));
router.post('/admin/reassign-coordinator', assigners, h(coordinatorAssignment.reassign));
router.post('/admin/unassign-coordinator', assigners, h(coordinatorAssignment.unassign));
router.get('/admin/booking/:booking/coordinators', withBind(assigners), h(coordinatorAssignment.assignedCoordinators));

// Summary counts (before {booking} so it isn't swallowed as a wildcard)
router.get('/coordinator/my-bookings/summary', assigners, h(coordinatorAssignment.summary));
router.get('/coordinator/my-bookings', assigners, h(coordinatorAssignment.myBookings));
router.get('/coordinator/my-bookings/:booking', withBind(assigners), h(coordinatorAssignment.show));

// ---- auth:sanctum + role:super-admin,city-admin -----------------------------------------------
const admins = [auth, role('super-admin', 'city-admin')];
router.post('/admin/bookings/:booking/approve-payment', withBind(admins), h(adminBooking.approvePayment));
router.post('/admin/bookings/:booking/reject-payment', withBind(admins), h(adminBooking.rejectPayment));
router.get('/admin/bookings/cancellation-requests', admins, h(adminBooking.cancellationRequests));
router.post('/admin/bookings/:booking/cancellation/approve', withBind(admins), h(adminBooking.approveCancellation));
router.post('/admin/bookings/:booking/cancellation/reject', withBind(admins), h(adminBooking.rejectCancellation));

// ---- prefix('admin') + auth:sanctum + role:super-admin,city-admin,co-ordinators,operation-head,contractors,staff,workers
const adminPrefix = [auth, role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'contractors', 'staff', 'workers')];
router.post('/admin/assign-booking', adminPrefix, h(bookingAssignment.assign));
router.post('/admin/reassign-booking', adminPrefix, h(bookingAssignment.reassign));

// Update booking (date, time_slot, status, payment_status)
router.put('/admin/bookings/:booking', withBind(adminPrefix), h(adminBooking.update));
router.patch('/admin/bookings/:booking', withBind(adminPrefix), h(adminBooking.update));

// approve booking
router.post('/admin/bookings/:booking/approve', withBind(adminPrefix), h(bookingApproval.approve));

// ---- no middleware in routes/api.php (it sits just after a closed auth group) ------------------
router.patch('/bookings/:booking/status', h(adminBooking.updateStatus));

// ---- auth:sanctum + role:super-admin,city-admin -----------------------------------------------
router.get('/alerts', admins, h(bookingAlert.index));
router.post('/alerts/mark-read', admins, h(bookingAlert.markRead));

// Dashboard counts: registered WITHOUT auth in routes/api.php (so getScopedCityId falls back to all cities / ?city_id)
router.get('/dashboard/counts', h(dashboard.counts));

// Completed bookings per month (auth:sanctum)
router.get('/dashboard/completed-monthly', auth, h(dashboard.completedMonthly));

module.exports = router;
