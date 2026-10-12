// Routes for BookingController (routes/api.php). Mounted under /api.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');
const ctrl = h(require('./booking.controller'));

const router = express.Router();

// Instant booking extension (no auth, link from WhatsApp)
router.get('/instant-bookings/:booking/extend', ctrl.showExtendForm);
router.get('/instant-bookings/:booking/extensions', ctrl.getExtensions);
router.post('/instant-bookings/:booking/extend', ctrl.extendInstant);

router.post('/whatsapp/send', ctrl.send);
router.post('/bot/validate-slot', ctrl.validateSlot);
router.post('/bot/validateslotinstant', ctrl.validateSlotInstant);
router.get('/bot/time_check', ctrl.time_check);

// Admin booking-list endpoints - authenticated so city-admin / co-ordinator requests are city scoped
router.get('/getbookings', auth, ctrl.index);
router.get('/bookings/filter', auth, ctrl.filterBookings);
router.get('/bookings/export', auth, ctrl.export);
router.get('/allcustomers/bookings', auth, ctrl.customersWithBookings);

// prefix('bot')
router.get('/bot/services', ctrl.services);
router.post('/bot/bookings', ctrl.bookingStore);
router.post('/bot/booking/slots', ctrl.slots);
router.get('/bot/bookings/:id', ctrl.show);

module.exports = router;
