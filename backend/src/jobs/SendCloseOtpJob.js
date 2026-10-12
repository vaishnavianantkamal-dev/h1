// PHP: scheduled every ten minutes (Schedule::job(new SendCloseOtpJob)). No payload.
const axios = require('axios');
const { Op } = require('sequelize');
const queue = require('./queue');
const config = require('../config');
const { Booking, Worker, BookingOtp } = require('../models');
const { dayjs } = require('../utils/time');

async function sendOtpWhatsapp(phone, otp) {
  const url = config.whatsapp.apiUrl; // PHP: config('services.whatsapp.url') = WHATSAPP_API_URL
  const token = config.whatsapp.accessToken;

  if (!url || !token) {
    console.error('WhatsApp config missing in SendCloseOtpJob');
    return;
  }

  phone = String(phone ?? '');
  phone = phone.startsWith('91') ? phone : '91' + phone;

  try {
    await axios.post(url, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'otp_verification',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: otp }] }],
      },
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    // Laravel Http::post does not throw on HTTP errors
  }
}

async function handle() {
  const bookings = await Booking.findAll({
    where: { status: 'confirmed', approved_at: { [Op.lte]: dayjs().subtract(1, 'hour').toDate() } },
  });

  for (const booking of bookings) {
    // Prevent duplicate close OTP
    const existing = await BookingOtp.findOne({ where: { booking_id: booking.id, type: 'close', verified_at: null } });
    if (existing) continue;

    const worker = await Worker.findByPk(booking.worker_id);
    if (!worker) continue;

    const otp = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    const expires = dayjs().add(15, 'minute').toDate();

    // CUSTOMER OTP
    await BookingOtp.create({
      booking_id: booking.id, receiver_type: 'customer', receiver_phone: booking.customer_phone,
      otp, type: 'close', expires_at: expires,
    });
    await sendOtpWhatsapp(booking.customer_phone, otp);

    // WORKER OTP
    await BookingOtp.create({
      booking_id: booking.id, receiver_type: 'worker', receiver_phone: worker.phone,
      otp, type: 'close', expires_at: expires,
    });
    await sendOtpWhatsapp(worker.phone, otp);
  }
}

queue.register('SendCloseOtpJob', handle);
module.exports = { handle };
