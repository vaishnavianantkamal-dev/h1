// Routes for BookingController (routes/web.php). Mounted at /.
const express = require('express');
const h = require('../../utils/asyncHandler');
const ctrl = h(require('./booking.controller'));

const router = express.Router();

router.get('/instant-bookings/:booking/extend', ctrl.showExtendForm);
router.post('/instant-bookings/:booking/extend', ctrl.extendInstant);

module.exports = router;
