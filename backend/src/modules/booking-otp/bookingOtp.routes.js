// routes/api.php: booking OTP / codes / end-service / timer (all public, no auth middleware in Laravel)
const express = require('express');
const h = require('../../utils/asyncHandler');
const ctrl = h(require('./bookingOtp.controller'));

const router = express.Router();

router.post('/booking/send-start-otp', ctrl.sendStartOtp);
router.post('/booking/sendstartotp', ctrl.sendStartOtp_Cron);
router.post('/booking/send-close-otp', ctrl.sendCloseOtp);
router.post('/booking/send-both-otp', ctrl.sendBothOtp);
router.post('/booking/verifyotp/:booking/:type', ctrl.verifyOtps);

router.post('/booking/generate-codes', ctrl.generateCodes);
router.get('/booking/active-code', ctrl.getActiveCode);
router.post('/booking/verifycode/:booking/:type', ctrl.verifyCode);
router.post('/booking/end-service', ctrl.endService);
router.get('/booking/timer', ctrl.serviceTimer);

module.exports = router;
