// Port of App\Http\Controllers\Api\SendPaymentLinkController
const crypto = require('crypto');
const axios = require('axios');
const sequelize = require('../../config/db');
const config = require('../../config');
const validate = require('../../utils/validate');
const { dayjs } = require('../../utils/time');
const { HttpError } = require('../../utils/errors');
const RazorpayService = require('../../services/RazorpayService');
const { Booking } = require('../../models');

module.exports = {
  async send(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      phone: 'required|regex:/^[1-9][0-9]{9,14}$/',
    });

    const t = await sequelize.transaction();
    let booking;
    let phone;
    try {
      booking = await Booking.findByPk(req.input('booking_id'), { transaction: t, lock: t.LOCK.UPDATE });
      if (!booking) throw new HttpError(404, `No query results for model [App\\Models\\Booking] ${req.input('booking_id')}`);

      // NOTE: PHP returns inside the transaction without commit/rollback for these early exits
      // (transaction is discarded at request end) - we roll back, which is equivalent.
      if (booking.payment_status === Booking.PAYMENT_PAID) {
        await t.rollback();
        return res.status(409).json({ success: false, message: 'Payment already completed' });
      }

      if (booking.status !== 'pending') {
        await t.rollback();
        return res.status(422).json({ success: false, message: 'Booking not eligible for payment' });
      }

      phone = String(req.input('phone')).replace(/\D/g, '').slice(-10);

      // Cancel previous link (best-effort)
      if (booking.razorpay_link_id) {
        try { await RazorpayService.cancelPaymentLink(booking.razorpay_link_id); } catch (e) { /* ignore */ }
      }

      const referenceId = `BOOKING_${booking.id}_${crypto.randomBytes(5).toString('hex').slice(0, 10).toUpperCase()}`;

      // createPaymentLink() converts rupees to paise itself - pass the exact rupee amount (keeps the paise)
      const payment = await RazorpayService.createPaymentLink(referenceId, Number(booking.amount), phone);

      await booking.update({
        razorpay_link_id: payment.id,
        payment_ref: referenceId,
        razorpay_payment_url: payment.short_url,
        payment_status: Booking.PAYMENT_PENDING,
        payment_attempted_at: dayjs().toDate(),
      }, { transaction: t });

      await t.commit();
    } catch (e) {
      try { await t.rollback(); } catch (_) { /* already finished */ }
      console.error('Payment link generation failed', JSON.stringify({ error: e.message }));
      return res.status(500).json({ success: false, message: 'Unable to generate payment link' });
    }

    // WhatsApp message
    const message = `\u{1F4B3} *Payment Request*\n\nBooking ID: #${booking.id}\nAmount: ₹${booking.amount}\n\nPay securely \u{1F447}\n\n${booking.razorpay_payment_url}`;

    await axios.post(
      `https://graph.facebook.com/v21.0/${config.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { preview_url: true, body: message },
      },
      { headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` }, validateStatus: () => true },
    );

    return res.json({
      success: true,
      payment_link: booking.razorpay_payment_url,
      reference_id: booking.payment_ref,
    });
  },
};
