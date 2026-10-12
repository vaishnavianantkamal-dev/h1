// Routes for Api\AadhaarKycController.
// In routes/api.php every one of these routes is COMMENTED OUT, so nothing is registered here.
// The block is preserved below (as Express equivalents) so it can be re-enabled by uncommenting.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const kyc = h(require('./aadhaarKyc.controller'));

const router = express.Router();

// //     // --- Worker Routes ------------------------------------------------
// // Route::middleware('auth:sanctum')->group(function () {
// //     Route::post('/kyc/initialize', [AadhaarKycController::class, 'initialize']);
// //     Route::post('/kyc/fetch',      [AadhaarKycController::class, 'fetchData']);
// //     Route::get('/kyc/status',      [AadhaarKycController::class, 'status']);
// // });
// router.post('/kyc/initialize', auth, kyc.initialize);
// router.post('/kyc/fetch', auth, kyc.fetchData);
// router.get('/kyc/status', auth, kyc.status);
//
// // Route::match(['get', 'post'], '/kyc/callback', [AadhaarKycController::class, 'callback']);
// router.get('/kyc/callback', kyc.callback);
// router.post('/kyc/callback', kyc.callback);
//
// // --- Admin Routes -------------------------------------------------
// // Route::middleware(['auth:sanctum', 'role:super-admin'])->prefix('admin/kyc')->group(function () {
// //     // Specific named routes MUST come BEFORE {workerId} wildcard
// //     Route::post('/initialize',         [AadhaarKycController::class, 'initialize']);
// //     Route::post('/fetch',              [AadhaarKycController::class, 'fetchData']);
// //     Route::get('/status',              [AadhaarKycController::class, 'status']);
// //     // Wildcard route LAST
// //     Route::get('/{workerId}',          [AadhaarKycController::class, 'workerKycDetail']);
// // });
// router.post('/admin/kyc/initialize', auth, role('super-admin'), kyc.initialize);
// router.post('/admin/kyc/fetch', auth, role('super-admin'), kyc.fetchData);
// router.get('/admin/kyc/status', auth, role('super-admin'), kyc.status);
// router.get('/admin/kyc/:workerId', auth, role('super-admin'), kyc.workerKycDetail);

// Enabled for the admin panel (Workers page KYC). Worker-facing /kyc/* routes stay disabled, as in Laravel.
router.post('/admin/kyc/initialize', auth, role('super-admin'), kyc.initialize);
router.post('/admin/kyc/fetch', auth, role('super-admin'), kyc.fetchData);
router.get('/admin/kyc/status', auth, role('super-admin'), kyc.status);
router.get('/admin/kyc/:workerId', auth, role('super-admin'), kyc.workerKycDetail);

module.exports = router;
