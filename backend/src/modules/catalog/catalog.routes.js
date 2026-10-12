// Routes from routes/api.php for: service categories, services (+plans), subscription types, extra time fees,
// addons, service do's & don'ts, customer service plans.  Order follows routes/api.php.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const { optionalAuth } = require('../../middleware/auth');
const { multipart } = require('./support');

const categories = h(require('./serviceCategory.controller'));
const services = h(require('./service.controller'));
const plans = h(require('./servicePlan.controller'));
const subscriptionTypes = h(require('./subscriptionType.controller'));
const extraTimeFees = h(require('./extraTimeFee.controller'));
const addons = h(require('./addon.controller'));
const dosDonts = h(require('./serviceDoDont.controller'));
const customerPlans = h(require('./customerServicePlan.controller'));

const router = express.Router();

// Route::apiResource('service-categories', ServiceCategoryController::class);
router.get('/service-categories', categories.index);
router.post('/service-categories', categories.store);
router.get('/service-categories/:service_category', categories.show);
router.put('/service-categories/:service_category', categories.update);
router.patch('/service-categories/:service_category', categories.update);
router.delete('/service-categories/:service_category', categories.destroy);

// Route::apiResource('services', ServiceController::class);
router.get('/services', services.index);
router.post('/services', multipart, services.store);
router.get('/services/:service', services.show);
router.put('/services/:service', multipart, services.update);
router.patch('/services/:service', multipart, services.update);
router.delete('/services/:service', services.destroy);

// Route::apiResource('services.plans', ServicePlanController::class);
router.get('/services/:service/plans', plans.index);
router.post('/services/:service/plans', plans.store);
router.get('/services/:service/plans/:plan', plans.show);
router.put('/services/:service/plans/:plan', plans.update);
router.patch('/services/:service/plans/:plan', plans.update);
router.delete('/services/:service/plans/:plan', plans.destroy);

router.get('/service-categories-with-services', categories.allCategoriesWithServiceNames);
// not behind auth:sanctum; the bearer token is optionally resolved (auth('sanctum')->user())
router.get('/services-by-category/:categoryId', optionalAuth, categories.getCategoryServices);
router.get('/service-categories-by-subscription/:subscriptionId', categories.getCategoriesBySubscription);

// Route::apiResource('subscription-types', SubscriptionTypeController::class);
router.get('/subscription-types', subscriptionTypes.index);
router.post('/subscription-types', subscriptionTypes.store);
router.get('/subscription-types/:subscription_type', h(async (req, res) => {
  const row = await require('../../models').SubscriptionType.findByPk(req.params.subscription_type);
  if (!row) return res.status(404).json({ message: 'No query results for model [App\\Models\\SubscriptionType] ' + req.params.subscription_type });
  return res.json(row);
}));
router.put('/subscription-types/:subscription_type', subscriptionTypes.update);
router.patch('/subscription-types/:subscription_type', subscriptionTypes.update);
router.delete('/subscription-types/:subscription_type', subscriptionTypes.destroy);

// Route::apiResource('extra-time-fees', ExtraTimeFeeController::class);
router.get('/extra-time-fees', extraTimeFees.index);
router.post('/extra-time-fees', extraTimeFees.store);
router.get('/extra-time-fees/:extra_time_fee', h(async (req, res) => {
  const row = await require('../../models').ExtraTimeFee.findByPk(req.params.extra_time_fee);
  if (!row) return res.status(404).json({ message: 'No query results for model [App\\Models\\ExtraTimeFee] ' + req.params.extra_time_fee });
  return res.json(row);
}));
router.put('/extra-time-fees/:extra_time_fee', extraTimeFees.update);
router.patch('/extra-time-fees/:extra_time_fee', extraTimeFees.update);
router.delete('/extra-time-fees/:extra_time_fee', extraTimeFees.destroy);

// Route::middleware(['auth:sanctum', 'role:super-admin,city-admin'])
router.get('/services-with-plans', auth, role('super-admin', 'city-admin'), services.withPlans);

// Addons CRUD
router.get('/addons', addons.index);
router.post('/addons', multipart, addons.store);
router.get('/addons/:addon', addons.show);
router.post('/addons/:addon', multipart, addons.update);
router.delete('/addons/:addon', addons.destroy);

// Service Do's & Don'ts - public (no auth)
router.get('/services/:service/dos-donts', dosDonts.byService);

// Service Do's & Don'ts CRUD (admin)
const dosDontsAdmin = [auth, role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'contractors', 'staff')];
router.get('/service-dos-donts', ...dosDontsAdmin, dosDonts.index);
router.post('/service-dos-donts', ...dosDontsAdmin, dosDonts.store);
router.get('/service-dos-donts/:serviceDoDont', ...dosDontsAdmin, dosDonts.show);
router.post('/service-dos-donts/:serviceDoDont', ...dosDontsAdmin, dosDonts.update);
router.delete('/service-dos-donts/:serviceDoDont', ...dosDontsAdmin, dosDonts.destroy);

// Member-aware plan pricing for a service (15 Days / 1 Month ...)  [customer prefix, auth:sanctum]
router.get('/customer/services/:service/plans', auth, customerPlans.index);

module.exports = router;
