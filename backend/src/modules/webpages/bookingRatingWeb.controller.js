// Port of App\Http\Controllers\Web\BookingRatingWebController
const axios = require('axios');
const { Booking, BookingRating } = require('../../models');
const validate = require('../../utils/validate');
const config = require('../../config');
const { abort } = require('../../utils/errors');
const { findOrFail } = require('../../utils/binding');
const views = require('./views');
const webSession = require('../../middleware/webSession');
const { ValidationError } = require('../../utils/errors');
const { expectsJson } = require('../../middleware/laravel');

async function sendThankYouWhatsApp(phone, name, rating) {
  phone = String(phone ?? '');
  phone = phone.startsWith('91') ? phone : '91' + phone;

  const message = `Hi ${name ?? ''} \u{1F60A}

Thank you for rating our service ⭐ ${rating}

Your feedback really helps us improve \u{1F64F}
Have a great day!`;

  const url = config.whatsapp.apiUrl;
  const token = config.whatsapp.accessToken;

  if (!url || !token) {
    console.error('WhatsApp config missing while sending thank you');
    return;
  }

  // Http::withToken($token)->post(...) does not throw on 4xx/5xx
  await axios.post(url, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message },
  }, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
}

const ctrl = {
  async show(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);

    if (booking.status !== 'completed') {
      abort(403);
    }

    if (await BookingRating.count({ where: { booking_id: booking.id } }) > 0) {
      return res.status(200).send('Thank you! Your rating has already been submitted.');
    }

    return res.type('html').send(views.ratingForm({ token: req.session.token, base: webSession.baseUrl(req) }));
  },

  async store(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);

    if (booking.status !== 'completed') {
      abort(403);
    }

    try {
      await validate(req, {
        rating: 'required|integer|min:1|max:5',
        description: 'nullable|string',
      });
    } catch (e) {
      // web group: a failed validation redirects back with the errors flashed (JSON requests get the 422)
      if (e instanceof ValidationError && !expectsJson(req)) return webSession.redirectBack(req, res, e.errors);
      throw e;
    }

    await BookingRating.create({
      booking_id: booking.id,
      worker_id: booking.worker_id,
      customer_id: booking.customer_id,
      rating: req.input('rating'),
      description: req.input('description'),
    });

    // SEND THANK YOU MESSAGE ON WHATSAPP
    await sendThankYouWhatsApp(booking.customer_phone, booking.customer_name, req.input('rating'));

    return res.type('html').send(views.ratingSuccess('\u{1F389} Thank you for your feedback!'));
  },
};

module.exports = ctrl;
