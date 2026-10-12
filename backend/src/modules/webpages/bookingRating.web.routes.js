// routes/web.php: rating page
const express = require('express');
const h = require('../../utils/asyncHandler');
const webSession = require('../../middleware/webSession');
const ctrl = h(require('./bookingRatingWeb.controller'));

const router = express.Router();

router.get('/rating/:booking', webSession.web, ctrl.show);
router.post('/rating/:booking', webSession.web, ctrl.store);

module.exports = router;
