// Port of App\Http\Controllers\Api\BookingRatingApiController
const axios = require('axios');
const { Booking, BookingRating } = require('../../models');
const config = require('../../config');
const { validate } = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');

const ratingUrl = (id) => `${config.appUrl}/rating/${id}`;

// Http::withToken(token)->post(url, ...)  (does not throw on HTTP error status)
async function sendWhatsApp(phone, message) {
  await axios.post(
    config.whatsapp.apiUrl,
    { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } },
    { headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` }, validateStatus: () => true }
  );
}

const format_Phone = (phone) => {
  phone = String(phone ?? '').replace(/\D/g, '');
  return phone.length === 10 ? '91' + phone : phone;
};
const formatPhone = (phone) => (String(phone ?? '').startsWith('91') ? phone : '91' + (phone ?? ''));

module.exports = {
  async sendRatingLink(req, res) {
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.status !== 'completed') {
      return res.status(400).json({ status: false, message: 'Booking not completed' });
    }

    if (booking.rating_link_sent_at) {
      return res.status(409).json({ status: false, message: 'Rating link already sent' });
    }

    if (await BookingRating.findOne({ where: { booking_id: booking.id } })) {
      return res.status(409).json({ status: false, message: 'Rating already submitted' });
    }

    const phone = formatPhone(booking.customer_phone);

    // PHP heredoc-style string keeps the 4-space source indentation on every line
    const message = ['Hi ' + (booking.customer_name ?? '') + ' 👋', '    ', '    Your service has been completed ✅  ', '    Please share your experience ⭐', '    ', '    👉 ' + ratingUrl(booking.id), '    ', '    Thank you for your time 🙏'].join('\n');

    await sendWhatsApp(phone, message);

    await booking.update({ rating_link_sent_at: new Date() });

    return res.json({ status: true, message: 'Rating link sent' });
  },

  async sendPendingRatingLinks(req, res) {
    const bookings = await Booking.findAll({ where: { status: 'completed', rating_link_sent_at: null } });

    for (const booking of bookings) {
      const phone = format_Phone(booking.customer_phone);

      const message = ['Hi ' + (booking.customer_name ?? '') + ' 👋', '    ', '    Your service has been completed ✅  ', '    Please share your experience ⭐', '    ', '    👉 ' + ratingUrl(booking.id), '    ', '    Thank you 🙏'].join('\n');

      await sendWhatsApp(phone, message);

      await booking.update({ rating_link_sent_at: new Date() });
    }

    return res.json({ status: true, count: bookings.length });
  },
};
