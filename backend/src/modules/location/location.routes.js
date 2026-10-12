// routes/api.php: //location
const express = require('express');
const h = require('../../utils/asyncHandler');
const city = h(require('./city.controller'));
const zone = h(require('./zone.controller'));
const area = h(require('./serviceableArea.controller'));

const router = express.Router();

// Route::apiResource('cities', CityController::class);
router.get('/cities', city.index);
router.post('/cities', city.store);
router.get('/cities/:city', city.show);
router.put('/cities/:city', city.update);
router.patch('/cities/:city', city.update);
router.delete('/cities/:city', city.destroy);

// Route::apiResource('zones', ZoneController::class);
router.get('/zones', zone.index);
router.post('/zones', zone.store);
router.get('/zones/:zone', zone.show);
router.put('/zones/:zone', zone.update);
router.patch('/zones/:zone', zone.update);
router.delete('/zones/:zone', zone.destroy);

// Route::apiResource('serviceable-areas', ServiceableAreaController::class);
router.get('/serviceable-areas', area.index);
router.post('/serviceable-areas', area.store);
router.get('/serviceable-areas/:serviceable_area', area.show);
router.put('/serviceable-areas/:serviceable_area', area.update);
router.patch('/serviceable-areas/:serviceable_area', area.update);
router.delete('/serviceable-areas/:serviceable_area', area.destroy);

module.exports = router;
