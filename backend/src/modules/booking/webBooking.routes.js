// Routes for WebBookingController / AppExtensionController / AdminExtensionController (routes/api.php)
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const throttle = require('../../middleware/throttle');
const web = h(require('./webBooking.controller'));
const app = h(require('./appExtension.controller'));
const adminExt = h(require('../admin/adminExtension.controller'));

const router = express.Router();

// public (outside the auth group in Laravel)
router.get('/customer/bookings/:booking/reschedule-history', web.getRescheduleHistory);

// auth:sanctum group
// web app booking
router.post('/web_booking', auth, throttle.booking, web.createBooking);
router.get('/customer/bookings', auth, web.customerBookings);
// Home-screen card slot: active-booking track card OR the dynamic banner.
router.get('/customer/home-instant-card', auth, web.homeInstantCard);
router.get('/customer/bookings/:booking', auth, web.bookingDetails);
router.get('/customer/bookings/:booking/extension-options', auth, web.instantExtensionOptions);
router.post('/customer/bookings/:booking/extend', auth, web.extendInstant);

// New settings-driven extend flow (app/web only).
router.get('/customer/bookings/:booking/extend/options', auth, app.options);
router.post('/customer/bookings/:booking/extend/new', auth, app.extend);
router.post('/customer/bookings/:booking/extend/verify', auth, app.verify);

router.post('/customer/bookings/:booking/cancel', auth, web.cancelBooking);
router.post('/customer/bookings/:booking/reschedule-monthly', auth, web.rescheduleMonthly);

router.post('/customer/bookings/:booking/subscription/pause', auth, web.pauseSubscription);
router.post('/customer/bookings/:booking/subscription/resume', auth, web.resumeSubscription);
router.delete('/customer/bookings/:booking/subscription/cancel', auth, web.cancelSubscription);
router.get('/bookings/:booking/subscription/pause-history', auth, web.getPauseHistory);

// Extends requested today (role: super-admin, city-admin, contractors, co-ordinators)
router.get('/admin/extensions/today', auth, role('super-admin', 'city-admin', 'contractors', 'co-ordinators'), adminExt.today);

// Admin-side subscription pause (role + city instead of ownership)
router.post('/admin/bookings/:booking/subscription/pause', auth, role('super-admin', 'city-admin', 'co-ordinators'), web.adminPauseSubscription);
router.get('/admin/bookings/:booking/subscription/pause-history', auth, role('super-admin', 'city-admin', 'co-ordinators'), web.adminPauseHistory);

module.exports = router;
