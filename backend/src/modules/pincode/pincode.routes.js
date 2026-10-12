// routes/api.php: //pincode apis  (no auth - the sanctum group is commented out in Laravel)
const express = require('express');
const h = require('../../utils/asyncHandler');
const throttle = require('../../middleware/throttle');
const ctrl = h(require('./pincode.controller'));

const router = express.Router();

// List all - no wildcard
router.get('/pincodes', ctrl.index);

// Check availability - static word "check", before wildcard
router.post('/pincodes/check', throttle.pincodeCheck, ctrl.check);

// Show single - wildcard {pincode}, always LAST
router.get('/pincodes/:pincode', ctrl.show);

// Add new pincode
router.post('/pincodes', ctrl.store);

// Edit pincode (PUT = full update, PATCH = partial update)
router.put('/pincodes/:pincode', ctrl.update);
router.patch('/pincodes/:pincode', ctrl.update);

// Delete pincode (soft delete)
router.delete('/pincodes/:pincode', ctrl.destroy);

// Toggle active/inactive status
router.patch('/pincodes/:pincode/toggle', ctrl.toggle);

module.exports = router;
