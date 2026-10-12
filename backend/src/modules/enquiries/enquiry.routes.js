// routes/api.php: Route::prefix('enquiries') and Route::prefix('deep-cleaning-enquiries') (no middleware)
const express = require('express');
const h = require('../../utils/asyncHandler');
const enquiry = h(require('./enquiry.controller'));
const deepCleaning = h(require('./deepCleaningEnquiry.controller'));
const serviceRequest = h(require('./serviceRequest.controller'));
const throttle = require('../../middleware/throttle');

const router = express.Router();

router.get('/enquiries', enquiry.index);
router.get('/enquiries/:id', enquiry.show);
router.post('/enquiries', enquiry.store);

router.get('/deep-cleaning-enquiries', deepCleaning.index);
router.get('/deep-cleaning-enquiries/:id', deepCleaning.show);
router.post('/deep-cleaning-enquiries', deepCleaning.store);

// Hobit1: website service booking requests (access rules in middleware/routeGuards.js)
router.get('/service-requests', serviceRequest.index);
router.post('/service-requests', throttle.throttle(5, 1), serviceRequest.store);
router.get('/service-requests/:id', serviceRequest.show);
router.patch('/service-requests/:id/status', serviceRequest.updateStatus);

module.exports = router;
