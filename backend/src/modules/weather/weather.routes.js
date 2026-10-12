// routes/api.php - Weather Union API routes (public)
const express = require('express');
const h = require('../../utils/asyncHandler');
const ctrl = h(require('./weather.controller'));

const router = express.Router();

router.get('/weather/current', ctrl.current);
router.get('/weather/condition', ctrl.condition);

module.exports = router;
