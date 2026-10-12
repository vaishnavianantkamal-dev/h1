const express = require('express');
const h = require('../../utils/asyncHandler');
const ctrl = h(require('./cron.controller'));

const router = express.Router();

router.get('/cron/instant', ctrl.cronInstant);

module.exports = router;
