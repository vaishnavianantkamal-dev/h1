// Port of App\Http\Controllers\Webhooks\WhatsappBookingWebhookController
const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { Booking, User, sequelize } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const queue = require('../../jobs/queue');
const { ValidationError } = require('../../utils/errors');
const { dayjs } = require('../../utils/time');

const nowStr = () => dayjs().format('YYYY-MM-DD HH:mm:ss');

// Str::random(12)
const randomString = (n) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += chars[bytes[i] % chars.length];
  return out;
};

async function sendUpiPaymentMessage(phone, booking) {
  const upiLink = `upi://pay?pa=sonsakhi@upi&pn=Sonsakhi%20Collections&am=${booking.toJSON().amount}&cu=INR&tn=Booking%20${booking.id}`;

  await sequelize.query(
    'INSERT INTO whatsapp_payment_requests (booking_id, upi_link, created_at, updated_at) VALUES (:booking_id, :upi_link, :now, :now)',
    { replacements: { booking_id: booking.id, upi_link: upiLink, now: nowStr() }, type: QueryTypes.INSERT },
  );

  // Actual WhatsApp Cloud API call goes here
}

const ctrl = {
  async handle(req, res) {
    // 1. Log webhook
    await sequelize.query(
      'INSERT INTO whatsapp_webhooks (`from`, flow_token, payload, created_at, updated_at) VALUES (:from, :flow_token, :payload, :now, :now)',
      {
        replacements: {
          from: req.input('from'),
          flow_token: req.input('flow_token'),
          payload: JSON.stringify(req.all()),
          now: nowStr(),
        },
        type: QueryTypes.INSERT,
      },
    );

    // 2. Validate payload
    try {
      await validate(req, {
        from: 'required|string',
        'data.service_id': 'required|integer',
        'data.booking_date': 'required|date',
        'data.time_slot': 'required|string',
        'data.address': 'required|string',
        'data.amount': 'required|numeric|min:1',
      });
    } catch (e) {
      if (e instanceof ValidationError) {
        return res.status(422).json({ success: false, errors: e.errors });
      }
      throw e;
    }

    const from = req.input('from');
    const data = req.input('data');

    // 3. Customer auto-create
    let customer = await User.findOne({ where: { phone: from } });
    if (!customer) {
      customer = await User.create({
        phone: from,
        name: 'WhatsApp Customer',
        password: hash.make(randomString(12)),
        role: 'customer',
        is_active: true,
      });
    }

    // 4. Prevent slot double-booking
    const slotTaken = await Booking.count({
      where: { booking_date: data.booking_date, time_slot: data.time_slot, status: ['pending', 'confirmed'] },
    });

    if (slotTaken > 0) {
      return res.status(409).json({ success: false, message: 'Slot already booked' });
    }

    // 5. Create new booking
    const booking = await Booking.create({
      customer_id: customer.id,
      service_id: data.service_id,
      booking_date: data.booking_date,
      time_slot: data.time_slot,
      address: data.address,
      amount: data.amount,
      status: 'pending',
      payment_status: 'unpaid',
    });

    // 6. Dispatch auto-cancel job (15 minutes)
    await queue.dispatch('CancelUnpaidBookingJob', { bookingId: booking.id }, { delaySeconds: 15 * 60 });

    // 7. Send payment request
    await sendUpiPaymentMessage(customer.phone, booking);

    return res.json({ success: true, booking_id: booking.id, message: 'Booking created. Payment requested.' });
  },

  // Not routed in Laravel either (kept for parity).
  async confirmPayment(req, res) {
    const replyId = req.input('reply_id') ?? '';

    if (!String(replyId).startsWith('paid_')) {
      return res.status(400).json({ message: 'Invalid reference' });
    }

    const bookingId = String(replyId).replace('paid_', '');
    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.payment_status !== 'unpaid') {
      return res.status(200).json({ message: 'Already processed' });
    }

    await booking.update({ payment_status: 'verification_pending' });

    return res.json({ success: true, message: 'Payment marked for admin verification' });
  },
};

module.exports = ctrl;
