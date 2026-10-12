const express = require('express');
const h = require('../../utils/asyncHandler');
const ctrl = h(require('./sendotp.controller'));

const router = express.Router();

router.post('/booking/send-otp', ctrl.sendOtp);
router.post('/booking/verify-otp', ctrl.verifyOtp);

module.exports = router;
