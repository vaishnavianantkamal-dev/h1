// routes/web.php: live tracking HTML pages
const express = require('express');
const h = require('../../utils/asyncHandler');
const live = h(require('./liveTracking.controller'));

const router = express.Router();

router.get('/worker/track/:booking_id', live.workerPage);
router.get('/track/:booking_id', live.clientPage);

module.exports = router;
