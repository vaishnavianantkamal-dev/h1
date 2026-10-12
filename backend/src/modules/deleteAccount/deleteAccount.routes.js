// routes/api.php: delete account requests
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');
const ctrl = h(require('./deleteAccount.controller'));

const router = express.Router();

router.post('/delete-account-request', ctrl.createRequest);
router.get('/delete-account-requests', auth, ctrl.listRequests);
router.post('/delete-account-requests/:id', auth, ctrl.updateRequest);

module.exports = router;
