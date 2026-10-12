// Settings routes from routes/api.php
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');

const ctrl = h(require('./adminSetting.controller'));

const router = express.Router();

// Public: active cart charges (platform fee, travelling charge, GST %) for the frontend
router.get('/settings/charges', ctrl.charges);

// Route::middleware(['auth:sanctum', 'role:super-admin,city-admin,contractors,co-ordinators'])
const adminGroup = [auth, role('super-admin', 'city-admin', 'contractors', 'co-ordinators')];
router.get('/admin/settings', ...adminGroup, ctrl.index);
router.get('/admin/settings/referral-points', ...adminGroup, ctrl.referralPoints);
router.get('/admin/settings/closing-time', ...adminGroup, ctrl.closingTime);
router.get('/admin/settings/extend', ...adminGroup, ctrl.extendSettings);
router.put('/admin/settings/referral-points', ...adminGroup, ctrl.updateReferralPoints);
router.put('/admin/settings/closing-time', ...adminGroup, ctrl.updateClosingTime);
router.put('/admin/settings/charges', ...adminGroup, ctrl.updateCharges);
router.put('/admin/settings/extend', ...adminGroup, ctrl.updateExtendSettings);

module.exports = router;
