// Routes from routes/api.php for: Admin/WorkerController, Api/Admin/AdminWorkerController, ContractorController,
// BankDetailsController, WorkerWithdrawController, CommissionController, CommissionCalculationController.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const throttle = require('../../middleware/throttle');
const upload = require('../../middleware/upload');
const requestHelpers = require('../../middleware/request');

// multipart bodies are parsed after the global request middleware ran, so trim/null-ify them again
const multipart = [...upload.any(), requestHelpers];

const workerCtrl = h(require('./worker.controller'));
const adminWorkerCtrl = h(require('./adminWorker.controller'));
const contractorCtrl = h(require('./contractor.controller'));
const bankCtrl = h(require('./bankDetails.controller'));
const withdrawCtrl = h(require('./workerWithdraw.controller'));
const commissionCtrl = h(require('./commission.controller'));
const calcCtrl = h(require('./commissionCalculation.controller'));

const router = express.Router();

// POST /worker/withdraw (auth:sanctum)
router.post('/worker/withdraw', auth, ...multipart, withdrawCtrl.withdraw);

// Public contractors list
router.get('/contractors', contractorCtrl.index);
router.get('/contractors/:contractor', contractorCtrl.show);

// Instant worker availability (throttle:instant-worker)
router.get('/instant_workers', throttle.instantWorker, workerCtrl.instantWorker);

// Public bank-by-id routes
router.put('/worker/update_bank_by_id', bankCtrl.update_by_id);
router.get('/worker/bank-details_by_id/:user_id', bankCtrl.show_by_id);

// auth:sanctum group
router.get('/withdrawal/:user/history', auth, withdrawCtrl.withdrawal_history);
router.get('/worker/bank-details', auth, bankCtrl.show);
router.put('/worker/update_bank_details', auth, bankCtrl.update);

// auth:sanctum + role:super-admin,city-admin,contractors,co-ordinators
const kycRoles = [auth, role('super-admin', 'city-admin', 'contractors', 'co-ordinators')];
router.post('/admin/workers/:worker/approve-kyc', ...kycRoles, adminWorkerCtrl.approveKyc);
router.post('/admin/workers/:worker/reject-kyc', ...kycRoles, adminWorkerCtrl.rejectKyc);
router.patch('/admin/workers/:worker/kyc/pending', ...kycRoles, adminWorkerCtrl.pendingKyc);
router.post('/admin/workers/:worker/kyc/update', ...kycRoles, ...multipart, adminWorkerCtrl.updateKycStatus);

// auth:sanctum + role:... + prefix admin
const adminRoles = [
  auth,
  role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'contractors', 'staff', 'workers'),
];
// WORKERS
router.get('/admin/workers', ...adminRoles, workerCtrl.index);
router.get('/admin/unassigned_worker/:booking', ...adminRoles, workerCtrl.unassigned_worker);
router.post('/admin/workers', ...adminRoles, ...multipart, workerCtrl.store);
router.get('/admin/workers/:id', ...adminRoles, workerCtrl.show);
router.patch('/admin/workers/:id/status', ...adminRoles, workerCtrl.updateStatus);
router.delete('/admin/workers/:id', ...adminRoles, workerCtrl.destroy);

// Commission (apiResource 'commissions')
router.get('/admin/commissions', ...adminRoles, commissionCtrl.index);
router.post('/admin/commissions', ...adminRoles, ...multipart, commissionCtrl.store);
router.get('/admin/commissions/:commission', ...adminRoles, commissionCtrl.show);
router.put('/admin/commissions/:commission', ...adminRoles, commissionCtrl.update);
router.patch('/admin/commissions/:commission', ...adminRoles, commissionCtrl.update);
router.delete('/admin/commissions/:commission', ...adminRoles, commissionCtrl.destroy);

router.get('/admin/commissions-calculation', ...adminRoles, calcCtrl.index);
router.get('/admin/commissions-calculation/:bookingId', ...adminRoles, calcCtrl.showByBooking);
router.get('/admin/commission/summary', ...adminRoles, calcCtrl.summary);

router.post('/admin/withdrawals/:id/approve', ...adminRoles, ...multipart, withdrawCtrl.approve);
router.post('/admin/withdrawals/:id/reject', ...adminRoles, ...multipart, withdrawCtrl.reject);
router.get('/admin/withdrawals', ...adminRoles, withdrawCtrl.get_withdrawls);

module.exports = router;
