// Time-slot routes from routes/api.php
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');

const { multipart } = require('../catalog/support');
const timeSlots = h(require('./timeSlot.controller'));
const getTime = h(require('./getTime.controller'));
const slotAvailability = h(require('./slotAvailability.controller'));

const router = express.Router();

// get time slot (public)
router.get('/time-slots', getTime.getAvailableSlots);

// Route::prefix('admin')->middleware(['auth:sanctum', 'role:super-admin'])  -- slot management
const adminGroup = [auth, role('super-admin')];
router.get('/admin/time-slots', ...adminGroup, timeSlots.index);
router.post('/admin/time-slots', ...adminGroup, multipart, timeSlots.store);
router.post('/admin/time-slots/bulk', ...adminGroup, multipart, timeSlots.bulkStore);
router.post('/admin/time-slots/block', ...adminGroup, multipart, timeSlots.blockSlots);
router.post('/admin/time-slots/unblock', ...adminGroup, multipart, timeSlots.unblockSlots);
router.get('/admin/time-slots/blocked', ...adminGroup, timeSlots.blockedList);

// {id} constrained to numbers only (whereNumber) - prevents "blocked" from matching here
router.get('/admin/time-slots/:id(\\d+)', ...adminGroup, timeSlots.show);
router.put('/admin/time-slots/:id(\\d+)', ...adminGroup, timeSlots.update);
router.delete('/admin/time-slots/:id(\\d+)', ...adminGroup, timeSlots.destroy);
router.patch('/admin/time-slots/:id(\\d+)/restore', ...adminGroup, timeSlots.restore);

// CUSTOMER API ROUTES
router.get('/slots', slotAvailability.available);
router.get('/time-slots/status', timeSlots.slotStatus);

module.exports = router;
