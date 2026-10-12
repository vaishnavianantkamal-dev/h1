// routes/api.php: Route::middleware(['auth:sanctum','role:...'])->prefix('admin') - users / customers / admins
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth, role } = require('../../middleware/auth');
const adminUser = h(require('./adminUser.controller'));
const customer = h(require('./customer.controller'));

const router = express.Router();

const adminRoles = role('super-admin', 'city-admin', 'co-ordinators', 'operation-head', 'contractors', 'staff', 'workers');
const chain = [auth, adminRoles];

// all user api
router.get('/admin/users', ...chain, adminUser.users);

// CUSTOMERS
router.get('/admin/customers', ...chain, customer.index);
// Active members (customers with a live paid subscription) - must be before
// customers/{id} so "members" isn't captured as an id.
router.get('/admin/members', ...chain, customer.members);
router.post('/admin/customers', ...chain, customer.store);
router.get('/admin/customers/:id', ...chain, customer.show);
router.delete('/admin/customers/:id', ...chain, customer.destroy);

// ADMIN USERS (ONLY ADMIN SHOULD MANAGE ADMINS): Route::middleware('role:super-admin')
const superAdmin = role('super-admin');
router.get('/admin/admins', ...chain, superAdmin, adminUser.index);
router.post('/admin/admins', ...chain, superAdmin, adminUser.store);
router.delete('/admin/users/:user', ...chain, superAdmin, adminUser.destroy);

module.exports = router;
