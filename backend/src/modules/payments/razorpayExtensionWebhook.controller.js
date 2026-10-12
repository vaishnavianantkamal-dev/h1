// Port of App\Http\Controllers\RazorpayExtensionWebhookController
const crypto = require('crypto');
const sequelize = require('../../config/db');
const config = require('../../config');
const { dayjs } = require('../../utils/time');
const PhoneHelper = require('../../helpers/PhoneHelper');
const { Booking, BookingExtension, Transaction, User } = require('../../models');
const php = require('./phpish');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

async function saveTransaction(payment, booking, t) {
  php.assertNullableArray(payment); // ?array $payment
  if (!payment || !payment.id) {
    console.warn('Extension webhook: saveTransaction called with empty payment entity');
    return;
  }
  let userId = booking ? booking.customer_id : null;
  if (!userId) {
    const phone = PhoneHelper.normalize(payment.contact || null);
    if (phone) {
      const user = await User.findOne({ where: sequelize.where(sequelize.fn('RIGHT', sequelize.col('phone'), 10), phone), transaction: t });
      userId = user ? user.id : null;
    }
  }
  const values = {
    amount: php.div100(payment.amount),
    amount_refunded: php.div100(payment.amount_refunded),
    currency: payment.currency || 'INR',
    method: payment.method || null,
    status: 'captured',
    contact: payment.contact || null,
    email: payment.email || null,
    description: payment.description || null,
    order_id: payment.order_id || null,
    user_id: userId,
    paid_at: payment.created_at !== undefined && payment.created_at !== null ? dayjs.unix(parseInt(payment.created_at, 10)).toDate() : new Date(),
  };
  const existing = await Transaction.findOne({ where: { payment_id: payment.id }, transaction: t });
  if (existing) await existing.update(values, { transaction: t });
  else await Transaction.create({ payment_id: payment.id, ...values }, { transaction: t });
  console.log('Extension webhook: Transaction saved', JSON.stringify({ payment_id: payment.id, user_id: userId, amount: values.amount }));
}

const handle = async (req, res) => {
  // Verify Signature
  const signature = req.headers['x-razorpay-signature'];
  const secret = config.razorpay.webhookSecret || '';
  const raw = req.rawBody || Buffer.from('');
  if (!signature || !safeEqual(crypto.createHmac('sha256', secret).update(raw).digest('hex'), signature)) {
    return res.status(403).send('Invalid signature');
  }

  // Accept both events
  const evIn = req.input('event'); // in_array() is loose: `true == 'payment_link.paid'`
  if (!(evIn === true || ['payment_link.paid', 'payment.captured'].includes(evIn))) {
    return res.json({ ignored: true });
  }

  const linkId = req.input('payload.payment_link.entity.id') ?? req.input('payload.payment.entity.notes.link_id');
  if (!php.truthy(linkId)) return res.json({ invalid_payload: true });

  const paymentEntity = req.input('payload.payment.entity');

  const t = await sequelize.transaction();
  try {
    const extension = await BookingExtension.findOne({ where: { razorpay_link_id: linkId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!extension) {
      await t.rollback();
      return res.json({ not_extension_payment: true });
    }
    if (extension.payment_status === 'paid') {
      await t.rollback();
      return res.json({ already_processed: true });
    }

    await extension.update({ payment_status: 'paid', paid_at: new Date() }, { transaction: t });

    const booking = await Booking.findByPk(extension.booking_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) {
      await t.rollback();
      return res.json({ booking_not_found: true });
    }

    // Increase time + increment extension count
    await booking.update({
      service_end_at: dayjs(booking.service_end_at).add(extension.duration_minutes, 'minute').toDate(),
      extension_count: (parseInt(booking.extension_count, 10) || 0) + 1,
      reminder_sent_at: null,
      end_reminder_15_sent_at: null, // re-arm 15-min reminder for the new end time
    }, { transaction: t });

    await saveTransaction(paymentEntity, booking, t);

    await t.commit();
    return res.json({ success: true });
  } catch (e) {
    try { await t.rollback(); } catch (_) { /* already finished */ }
    console.error('Extension webhook failed', JSON.stringify({ error: e.message, payload: req.all() }));
    return res.status(500).json({ error: true });
  }
};

module.exports = { handle };
