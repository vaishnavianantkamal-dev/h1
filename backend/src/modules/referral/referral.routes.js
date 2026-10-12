// routes/api.php: referral routes (auth:sanctum group + public referral APIs)
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');
const ctrl = h(require('./referral.controller'));

const router = express.Router();

// Route::middleware('auth:sanctum')->group(...)
router.get('/referral/my-link', auth, ctrl.myReferralLink);
router.get('/referral', auth, ctrl.get_all_refrals);
router.get('/referrers/dropdown', auth, ctrl.referrersDropdown);
router.get('/referral/earnings', auth, ctrl.myReferralEarnings);
router.post('/referral/redeem', auth, ctrl.redeemPoints);
router.get('/referrers/:user/referred-workers', auth, ctrl.referredWorkers);

// Public referral APIs
router.post('/refer-and-earn', ctrl.referAndEarn);

module.exports = router;
