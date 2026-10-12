// routes/api.php: GET /api/verify-otp/{booking}/{type} -> OtpVerifyController@verify (no middleware)
const express = require('express');
const h = require('../../utils/asyncHandler');
const ctrl = h(require('./otpVerify.controller'));

const router = express.Router();

router.get('/verify-otp/:booking/:type', ctrl.verify);

module.exports = router;
