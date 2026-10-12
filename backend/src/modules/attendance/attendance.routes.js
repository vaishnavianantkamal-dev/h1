// routes/api.php: attendance
const express = require('express');
const h = require('../../utils/asyncHandler');
const upload = require('../../middleware/upload');
const { auth, role } = require('../../middleware/auth');
const ctrl = h(require('./attendance.controller'));

const router = express.Router();

// auth:sanctum
router.post('/checkin', auth, upload.any(), ctrl.checkin);
router.post('/checkout', auth, ctrl.checkout);
router.get('/attendance/my', auth, ctrl.myAttendance);

// auth:sanctum + role:super-admin,city-admin
const admin = [auth, role('super-admin', 'city-admin')];
router.get('/attendance', ...admin, ctrl.allAttendance);
router.get('/attendance/workers', ...admin, ctrl.workersList);
router.get('/attendance/worker/:workerId', ...admin, ctrl.workerAttendance);
router.get('/office-location', ...admin, ctrl.getOfficeLocation);
router.post('/office-location', ...admin, ctrl.setOfficeLocation);

module.exports = router;
