// routes/web.php: OTP verify page
const express = require('express');
const h = require('../../utils/asyncHandler');
const webSession = require('../../middleware/webSession');
const ctrl = h(require('./otpVerify.controller'));

const router = express.Router();

router.get('/verify-otp/:booking/:type', webSession.web, ctrl.show);
router.post('/verify-otp/:booking/:type', webSession.web, ctrl.verify);

module.exports = router;
