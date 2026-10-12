// routes/api.php: resident survey + maid survey (no middleware)
const express = require('express');
const h = require('../../utils/asyncHandler');
const resident = h(require('./residentSurvey.controller'));
const maid = h(require('./maidSurvey.controller'));

const router = express.Router();

// survey form
router.post('/resident-surveys', resident.store);
router.get('/resident-surveys', resident.index);
router.get('/resident-surveys/:id', resident.show);

// maid survey form
router.post('/maid-survey', maid.store);
router.get('/maid-survey', maid.index);
router.get('/maid-survey/:id', maid.show);

module.exports = router;
