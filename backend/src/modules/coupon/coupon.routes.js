// Coupon routes from routes/api.php
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');

const ctrl = h(require('./coupon.controller'));

const router = express.Router();

// Route::prefix('coupons')  (no auth middleware in the source)
router.get('/coupons', ctrl.index);
router.post('/coupons', ctrl.store);
router.get('/coupons/:coupon', ctrl.show);
router.put('/coupons/:coupon', ctrl.update);
router.delete('/coupons/:coupon', ctrl.destroy);
router.patch('/coupons/:coupon/toggle-status', ctrl.toggleStatus);

// User coupons: Route::middleware('auth:sanctum')->prefix('user')
router.get('/user/coupons', auth, ctrl.activeCoupons);
router.post('/user/coupons/validate', auth, ctrl.validateCoupon);

module.exports = router;
