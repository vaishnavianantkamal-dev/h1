// routes/api.php: events (no middleware in Laravel)
const express = require('express');
const h = require('../../utils/asyncHandler');
const upload = require('../../middleware/upload');
const ctrl = h(require('./event.controller'));

const router = express.Router();

router.post('/events', ...upload.any(), ctrl.store);
router.post('/events/store-for-customer', ...upload.any(), ctrl.storeForCustomer);
router.get('/events', ctrl.index);
router.delete('/events/:id', ctrl.destroy);

module.exports = router;
