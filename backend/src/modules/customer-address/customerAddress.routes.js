// routes/api.php: Route::middleware('auth:sanctum') group - customer address
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');
const ctrl = h(require('./customerAddress.controller'));

const router = express.Router();

router.get('/addresses/has', auth, ctrl.hasAddress);
router.get('/addresses', auth, ctrl.index);
router.post('/addresses', auth, ctrl.store);
router.get('/address/:id', auth, ctrl.show);
router.put('/addresses/:id', auth, ctrl.update);
router.patch('/addresses/:id/default', auth, ctrl.setDefault);
router.delete('/addresses/:id', auth, ctrl.destroy);

module.exports = router;
