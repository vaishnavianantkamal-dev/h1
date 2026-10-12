// routes/api.php: Route::middleware('auth:sanctum') group - roles & permissions
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');
const role = h(require('./role.controller'));
const rolePermission = h(require('./rolePermission.controller'));
const permission = h(require('../permission/permission.controller'));

const router = express.Router();

router.get('/roles', auth, role.index);
router.post('/roles', auth, role.store);
router.get('/roles/:role', auth, role.show);
router.put('/roles/:role', auth, role.update);
router.delete('/roles/:role', auth, role.destroy);

router.get('/permissions', auth, permission.index);

router.get('/roles/:role/permissions', auth, rolePermission.edit);
router.post('/roles/:role/permissions', auth, rolePermission.update);

module.exports = router;
