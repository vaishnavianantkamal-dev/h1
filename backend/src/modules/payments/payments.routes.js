// routes/api.php - payments / invoices / razorpay webhooks / transactions
const express = require('express');
const h = require('../../utils/asyncHandler');
const config = require('../../config');
const { auth, role } = require('../../middleware/auth');
const { HttpError } = require('../../utils/errors');

const webhook = h(require('./razorpayWebhook.controller'));
const extWebhook = h(require('./razorpayExtensionWebhook.controller'));
const sendPaymentLink = h(require('./sendPaymentLink.controller'));
const bookingInvoice = h(require('./bookingInvoice.controller'));
const cronInvoice = require('./cronBookingInvoice.controller');
const payment = h(require('./payment.controller'));
const transactions = h(require('./razorpayTransaction.controller'));

const router = express.Router();

// abort_unless(request()->header('X-CRON-KEY') === env('CRON_SECRET'), 403)
router.get('/cron/send-paid-booking-invoices', h(async (req, res) => {
  if (req.headers['x-cron-key'] !== config.cronSecret) throw new HttpError(403, '');
  return res.json(await cronInvoice.run());
}));

router.post('/bookings/:booking/send-invoice', bookingInvoice.sendInvoice);

router.post('/razorpay/webhook', webhook.handle);
router.post('/razorpay/extension/webhook', extWebhook.handle);
router.post('/booking/send-payment-link', sendPaymentLink.send);

// web app payment
router.post('/payment/create-order', auth, payment.createOrder);
router.post('/payment/verify', auth, payment.verify);

// auth:sanctum + role:super-admin,city-admin
router.get('/transactions', auth, role('super-admin', 'city-admin'), transactions.index);
router.get('/transactions/export', auth, role('super-admin', 'city-admin'), transactions.export);

module.exports = router;
