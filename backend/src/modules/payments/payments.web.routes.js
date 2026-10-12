// routes/web.php - razorpay webhooks (web variants), payment success page, UPI redirect
const express = require('express');
const h = require('../../utils/asyncHandler');
const { findOrFail } = require('../../utils/binding');
const { Booking } = require('../../models');

const webhook = h(require('./razorpayWebhook.controller'));
const extWebhook = h(require('./razorpayExtensionWebhook.controller'));

const router = express.Router();

// Laravel's web group applies ValidateCsrfToken to these POSTs (not excluded): always 419 for webhooks without a session token.
const lv = require('../../middleware/laravel');
const pageExpired = (req, res) => (lv.expectsJson(req) ? res.status(419).prettyJson({ message: 'CSRF token mismatch.' }) : lv.sendHtmlError(res, 419));
router.post('/razorpay/webhook', pageExpired);
router.post('/razorpay/extension/webhook', pageExpired);

router.get('/payment/success', (req, res) => res.type('html').send('Payment successful. Thank you!'));

router.get('/pay/booking/:booking', h(async (req, res) => {
  const booking = await findOrFail(Booking, req.params.booking);

  if (booking.payment_status === 'paid') {
    return res.status(200).send('Payment already completed');
  }

  // Generate unique transaction reference
  const txnId = `TXN${Math.floor(Date.now() / 1000)}${1000 + Math.floor(Math.random() * 9000)}`;

  // Proper UPI intent
  const upiIntent = 'upi://pay'
    + '?pa=pkk22722@oksbi'
    + '&pn=Hobit'
    + `&am=${Number(booking.amount).toFixed(2)}`
    + '&cu=INR'
    + `&tr=${txnId}`
    + `&tid=${txnId}`
    + `&tn=Booking_${booking.id}`;

  // redirect()->away(): Symfony RedirectResponse (302 + HTML meta-refresh body)
  const u = upiIntent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  return res.status(302).set('Location', upiIntent).set('Content-Type', 'text/html; charset=utf-8').end(
    `<!DOCTYPE html>\n<html>\n    <head>\n        <meta charset="UTF-8" />\n        <meta http-equiv="refresh" content="0;url='${u}'" />\n\n        <title>Redirecting to ${u}</title>\n    </head>\n    <body>\n        Redirecting to <a href="${u}">${u}</a>.\n    </body>\n</html>`,
  );
}));

module.exports = router;
