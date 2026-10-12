// Routes from routes/api.php: customer home screen, home categories, marquees, instant-help cards, banners.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, optionalAuth, role } = require('../../middleware/auth');
const { multipart } = require('../catalog/support');

const home = h(require('./home.controller'));
const homeCategories = h(require('./homeCategory.controller'));
const marquees = h(require('./marquee.controller'));
const instantCards = h(require('./instantHelpCard.controller'));
const banners = h(require('./banner.controller'));

const router = express.Router();

// Customer app home screen (public)
router.get('/home/categories', home.categories);
router.get('/home/categories/:homeCategory', home.categoryDetails);
router.get('/home/marquee', home.marquee);

// Home category management (admin) - no auth middleware in the source
router.get('/admin/home-categories', homeCategories.index);
router.post('/admin/home-categories', multipart, homeCategories.store);
router.get('/admin/home-categories/:homeCategory', homeCategories.show);
router.post('/admin/home-categories/:homeCategory', multipart, homeCategories.update);
router.delete('/admin/home-categories/:homeCategory', homeCategories.destroy);

// Route::apiResource('marquees', MarqueeController::class) inside prefix('admin')
router.get('/admin/marquees', marquees.index);
router.post('/admin/marquees', multipart, marquees.store);
router.get('/admin/marquees/:marquee', marquees.show);
router.put('/admin/marquees/:marquee', marquees.update);
router.patch('/admin/marquees/:marquee', marquees.update);
router.delete('/admin/marquees/:marquee', marquees.destroy);

// Instant-help home card: auth:sanctum + role:super-admin,city-admin,contractors,co-ordinators
const adminGroup = [auth, role('super-admin', 'city-admin', 'contractors', 'co-ordinators')];
router.get('/admin/instant-cards', ...adminGroup, instantCards.index);
router.post('/admin/instant-cards', ...adminGroup, multipart, instantCards.store);
router.post('/admin/instant-cards/:card', ...adminGroup, multipart, instantCards.update);
router.patch('/admin/instant-cards/:card/toggle', ...adminGroup, instantCards.toggle);
router.delete('/admin/instant-cards/:card', ...adminGroup, instantCards.destroy);

// Banners. Public app endpoint (static path before wildcard); bearer token optionally resolved.
router.get('/app/banners', optionalAuth, banners.app);

// Admin CRUD
router.patch('/banners/:banner/toggle', banners.toggle);
// Route::apiResource('banners', BannerController::class)
router.get('/banners', banners.index);
router.post('/banners', multipart, banners.store);
router.get('/banners/:banner', banners.show);
// PHP does not parse multipart bodies on PUT/PATCH -> Laravel sees an empty request, so no multer here.
router.put('/banners/:banner', banners.update);
router.patch('/banners/:banner', banners.update);
router.delete('/banners/:banner', banners.destroy);

module.exports = router;
