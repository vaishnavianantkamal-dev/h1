// Route::prefix('admin')->middleware(['auth:sanctum','role:super-admin']) - marketing campaigns
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const ctrl = h(require('./campaign.controller'));

const router = express.Router();
const guard = [auth, role('super-admin')];
const ID = ':id(\\d+)'; // ->whereNumber('id')

router.get('/admin/campaigns', guard, ctrl.index);
router.post('/admin/campaigns', guard, ...upload.any(), ctrl.store);
router.post('/admin/campaigns/upload-image', guard, ...upload.any(), ctrl.uploadImage);
router.get(`/admin/campaigns/${ID}`, guard, ctrl.show);
// POST (not PUT) so multipart image uploads work when editing
router.post(`/admin/campaigns/${ID}/update`, guard, ...upload.any(), ctrl.update);
router.delete(`/admin/campaigns/${ID}`, guard, ctrl.destroy);
router.patch(`/admin/campaigns/${ID}/toggle`, guard, ctrl.toggle);
router.post(`/admin/campaigns/${ID}/send`, guard, ...upload.any(), ctrl.send);
router.get(`/admin/campaigns/${ID}/status`, guard, ctrl.status);

module.exports = router;
