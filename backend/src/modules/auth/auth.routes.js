// routes/api.php: auth / register / forgot-password / customer auth routes
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const throttle = require('../../middleware/throttle');
const upload = require('../../middleware/upload');
const requestHelpers = require('../../middleware/request');
const authCtrl = h(require('./auth.controller'));
const registerCtrl = h(require('./register.controller'));
const forgotCtrl = h(require('./adminForgotPassword.controller'));
const customerAuth = h(require('./customerAuth.controller'));

// multipart bodies are parsed after the global request middleware ran, so trim/null-ify them again
const multipart = [...upload.any(), requestHelpers];

const router = express.Router();

// Admin forgot password (WhatsApp OTP)
router.post('/admin/forgot-password/send-otp', throttle.otp, forgotCtrl.sendOtp);
router.post('/admin/forgot-password/reset', forgotCtrl.reset);

// Route::middleware('auth:sanctum')->group(...)
router.post('/logout', auth, authCtrl.logout);
router.post('/logout-all', auth, authCtrl.logoutAll);

router.post('/register', ...multipart, registerCtrl.register);
router.post('/login', authCtrl.login);

// Route::middleware(['auth:sanctum','role:super-admin,city-admin,co-ordinators,operation-head,contractors,staff,workers'])->prefix('admin')
const adminRoles = role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'contractors', 'staff', 'workers');
router.get('/admin/user_profile/:user', auth, adminRoles, registerCtrl.user_profile);
// update user
router.put('/admin/users/:user', auth, adminRoles, ...multipart, registerCtrl.update);

// Customers Api (Rutuja): Route::prefix('customer')
router.post('/customer/send-otp', throttle.otp, customerAuth.sendOtp);
router.post('/customer/logout', auth, customerAuth.logout);
router.get('/customer/profile', auth, customerAuth.getProfile);
router.post('/customer/profile/update', auth, customerAuth.updateProfile);
router.post('/customer/resend-otp', customerAuth.resendOtp);
router.post('/customer/verify-otp', customerAuth.verifyOtp);
router.post('/customer/update-name', auth, customerAuth.updateName);

module.exports = router;
