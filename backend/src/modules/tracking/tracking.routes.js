// routes/api.php: live tracking
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const live = h(require('./liveTracking.controller'));
const workerLive = h(require('./workerLiveLocation.controller'));
const tracking = h(require('./tracking.controller'));

const router = express.Router();

router.post('/worker/location', live.updateLocation);
router.get('/track/:booking_id/latest', live.latestLocation);
router.get('/track/map_data/:booking_id', live.mapData);
router.post('/worker/live-location', workerLive.store);

// Firebase RTDB live tracking ("On My Way" mode) - auth:sanctum, prefix tracking
router.post('/tracking/start', auth, tracking.start);
router.post('/tracking/stop', auth, tracking.stop);
router.get('/tracking/:booking_id([0-9]+)', auth, tracking.show);

// admin group (auth:sanctum + role list, prefix admin): POST admin/tracking/update
router.post(
  '/admin/tracking/update',
  auth,
  role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'contractors', 'staff', 'workers'),
  live.updateLocation
);

module.exports = router;
