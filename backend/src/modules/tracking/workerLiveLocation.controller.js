// Port of App\Http\Controllers\Api\WorkerLiveLocationController
const axios = require('axios');
const { Booking, WorkerLiveLocation } = require('../../models');
const config = require('../../config');
const { validate } = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');

async function sendWhatsappLiveLocation(phone, url) {
  const token = config.whatsapp.accessToken;
  const phoneId = config.whatsapp.phoneNumberId;

  // ensure country code
  const to = String(phone ?? '').startsWith('91') ? phone : '91' + (phone ?? '');

  await axios.post(
    `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: `🚚 Your worker is on the way!\n\n📍 Track live location here 👇\n${url}` },
    },
    { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
  );
}

module.exports = {
  // POST /worker/live-location
  async store(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      worker_id: 'required|exists:workers,id',
      live_location_url: 'required|url',
    });

    // Save or update live location (updateOrCreate)
    const keys = { booking_id: req.input('booking_id'), worker_id: req.input('worker_id') };
    let location = await WorkerLiveLocation.findOne({ where: keys });
    if (location) await location.update({ live_location_url: req.input('live_location_url') });
    else location = await WorkerLiveLocation.create({ ...keys, live_location_url: req.input('live_location_url') });

    // customer_phone directly from bookings table
    const booking = await findOrFail(Booking, req.input('booking_id'));

    await sendWhatsappLiveLocation(booking.customer_phone, req.input('live_location_url'));

    return res.json({ status: true, message: 'Live location shared with customer', data: location });
  },
};
