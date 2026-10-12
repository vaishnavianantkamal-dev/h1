// Port of App\Http\Controllers\Api\SendotpController (booking OTP via WhatsApp)
const crypto = require('crypto');
const axios = require('axios');
const { Booking, BookingOtp, User } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const config = require('../../config');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');

const DT = 'YYYY-MM-DD HH:mm:ss';

module.exports = {
  /** SEND OTP FOR BOOKING */
  async sendOtp(req, res) {
    await validate(req, {
      booking_id: 'required|integer|exists:bookings,id',
      phone: 'required|string',
    });

    const phone = String(req.input('phone')).replace(/\D/g, '');

    const booking = await findOrFail(Booking, req.input('booking_id'));

    // Prevent resending if already verified
    if (booking.otp_verified) {
      return res.status(409).json({
        status: false,
        message: 'OTP already verified for this booking',
      });
    }

    // Rate limit: 1 OTP per 60 sec per booking
    if (booking.otp_expires_at && dayjs(booking.updated_at).isAfter(dayjs().subtract(60, 'second'))) {
      return res.status(429).json({
        status: false,
        message: 'Please wait before requesting another OTP',
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 1000000);

    // Save OTP in booking
    await booking.update({
      otp_hash: hash.make(otp),
      otp_expires_at: dayjs().add(15, 'minute').format(DT),
      otp_verified: 0,
    });

    // META AUTH PAYLOAD
    const payload = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'hobit_authentication',
        language: {
          code: 'en',
        },
        components: [
          // BODY {{1}}
          {
            type: 'body',
            parameters: [
              { type: 'text', text: String(otp) },
            ],
          },

          // BUTTON {{1}} (Copy Code URL)
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              { type: 'text', text: String(otp) },
            ],
          },
        ],
      },
    };

    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`,
      payload,
      {
        headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` },
        validateStatus: () => true,
      },
    );

    if (!(response.status >= 200 && response.status < 300)) {
      return res.status(500).json({
        status: false,
        message: 'Failed to send OTP',
        meta: response.data,
      });
    }

    return res.json({
      status: true,
      message: 'OTP sent successfully',
      booking_id: booking.id,
    });
  },

  /** VERIFY OTP FOR BOOKING */
  async verifyOtp(req, res) {
    await validate(req, {
      booking_id: 'required|integer|exists:bookings,id',
      otp: 'required|string',
      type: 'required|in:start,close',
    });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    // Latest unverified OTP for this booking + type
    const otpRow = await BookingOtp.findOne({
      where: { booking_id: booking.id, type: req.input('type'), verified_at: null },
      order: [['created_at', 'DESC']],
    });

    if (!otpRow) {
      return res.status(404).json({
        status: false,
        message: 'OTP not found',
      });
    }

    if (
      dayjs(otpRow.expires_at).isBefore(dayjs())
      || String(otpRow.otp) !== String(req.input('otp'))
    ) {
      return res.status(401).json({
        status: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark OTP verified
    await otpRow.update({
      verified_at: dayjs().format(DT),
    });

    // Update worker active status (if we can resolve worker by phone)
    const worker = await User.findOne({ where: { phone: otpRow.receiver_phone } });

    if (worker) {
      if (otpRow.type === 'start') {
        await worker.update({ is_active: 0 });
      }

      if (otpRow.type === 'close') {
        await worker.update({ is_active: 1 });
      }
    }

    return res.json({
      status: true,
      message: 'OTP verified successfully',
      otp_type: otpRow.type,
      worker_active: worker ? Number(worker.is_active) : null,
      booking_id: booking.id,
    });
  },
};
