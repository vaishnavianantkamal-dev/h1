// routes/api.php: WhatsApp coordinators / send-booking and the booking webhook
const express = require('express');
const h = require('../../utils/asyncHandler');
const throttle = require('../../middleware/throttle');
const whatsapp = h(require('./whatsapp.controller'));
const webhook = h(require('./whatsappBookingWebhook.controller'));

const router = express.Router();

// ->middleware('throttle:30,1')
router.post('/webhooks/whatsapp/booking', throttle.throttle(30, 1), webhook.handle);

router.get('/coordinators', whatsapp.getCoordinators);
router.post('/whatsapp/send-booking', whatsapp.sendBookingDetails);

// WhatsappBookingSyncController@sync has no route in Laravel.

module.exports = router;
