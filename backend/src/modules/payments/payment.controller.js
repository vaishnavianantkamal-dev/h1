// Port of App\Http\Controllers\Api\Payment\PaymentController
const Razorpay = require('razorpay');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
const config = require('../../config');
const validate = require('../../utils/validate');
const { dayjs } = require('../../utils/time');
const { findOrFail, firstOrFail } = require('../../utils/binding');
const CouponService = require('../../services/CouponService');
const { Booking, Coupon } = require('../../models');

const api = () => new Razorpay({ key_id: config.razorpay.key, key_secret: config.razorpay.secret });

module.exports = {
  // Create Razorpay Order
  async createOrder(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      coupon_code: 'nullable|string',
    });

    let booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.payment_status === Booking.PAYMENT_PAID) {
      return res.status(400).json({ message: 'Already paid' });
    }

    // Apply coupon if provided
    if (req.filled('coupon_code')) {
      // Don't apply again if already applied
      if (booking.coupon_id) {
        return res.status(422).json({ success: false, message: 'A coupon is already applied to this booking.' });
      }

      const code = String(req.input('coupon_code')).trim().toUpperCase();
      const coupon = await Coupon.findOne({ where: { code } });

      if (!coupon) {
        return res.status(422).json({ success: false, message: 'Invalid coupon code.' });
      }

      const result = await CouponService.apply(coupon.id, req.user.id, booking);

      if (!result.success) {
        return res.status(422).json({ success: false, message: result.message });
      }

      // Refresh booking with updated discounted amount
      await booking.reload();
    }

    // Create Razorpay Order with final amount
    const order = await api().orders.create({
      amount: Math.trunc(Number(booking.amount) * 100), // discounted amount in paise
      currency: 'INR',
      receipt: `booking_${booking.id}`,
    });

    await booking.update({ razorpay_order_id: order.id });

    return res.json({
      success: true,
      order_id: order.id,
      amount: booking.amount, // final discounted amount
      original_amount: booking.original_amount, // before discount (null if no coupon)
      discount_amount: booking.discount_amount, // discount applied (0 if no coupon)
      coupon_applied: !!booking.coupon_id,
      currency: 'INR',
      razorpay_key: config.razorpay.key,
    });
  },

  // Verify Payment
  async verify(req, res) {
    await validate(req, {
      razorpay_order_id: 'required|string',
      razorpay_payment_id: 'required|string',
      razorpay_signature: 'required|string',
    });

    const booking = await firstOrFail(Booking, { where: { razorpay_order_id: req.input('razorpay_order_id') } });

    // If already marked paid, don't do anything again
    if (booking.payment_status === Booking.PAYMENT_PAID) {
      return res.json({ success: true, booking });
    }

    const razorpay = api();

    try {
      // 1) Verify signature
      const ok = validatePaymentVerification(
        { order_id: req.input('razorpay_order_id'), payment_id: req.input('razorpay_payment_id') },
        req.input('razorpay_signature'),
        config.razorpay.secret,
      );
      if (!ok) throw new Error('Invalid signature');

      // 2) Fetch payment from Razorpay to confirm captured
      const payment = await razorpay.payments.fetch(req.input('razorpay_payment_id'));

      if (!payment || (payment.status || null) !== 'captured') {
        console.warn('Razorpay payment not captured', JSON.stringify({
          booking_id: booking.id,
          order_id: req.input('razorpay_order_id'),
          payment_id: req.input('razorpay_payment_id'),
          status: payment ? payment.status : null,
        }));
        return res.status(422).json({ success: false, message: 'Payment is not captured yet' });
      }
    } catch (e) {
      console.error('Razorpay payment verification failed', JSON.stringify({
        booking_id: booking.id,
        order_id: req.input('razorpay_order_id'),
        payment_id: req.input('razorpay_payment_id'),
        error: e.message,
      }));
      return res.status(422).json({ success: false, message: 'Payment verification failed' });
    }

    // 3) Mark booking as paid
    await booking.update({
      razorpay_payment_id: req.input('razorpay_payment_id'),
      razorpay_signature: req.input('razorpay_signature'),
      payment_status: Booking.PAYMENT_PAID,
      status: 'pending',
      paid_at: dayjs().toDate(),
    });

    return res.json({
      success: true,
      booking: {
        id: booking.id,
        amount: booking.amount,
        original_amount: booking.original_amount,
        discount_amount: booking.discount_amount,
        coupon_applied: !!booking.coupon_id,
        payment_status: booking.payment_status,
        status: booking.status,
      },
    });
  },
};
