// Port of App\Http\Controllers\RazorpayWebhookController
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const config = require('../../config');
const { dayjs } = require('../../utils/time');
const queue = require('../../jobs/queue');
const PhoneHelper = require('../../helpers/PhoneHelper');
const { Booking, BookingExtension, Transaction, User } = require('../../models');
const php = require('./phpish');

// Ensure the invoice job is registered
require('../../jobs/SendInvoiceWhatsAppJob');

const get = (o, p, d = null) => {
  const v = p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  return v === undefined ? d : v;
};
const notEmpty = (v) => php.truthy(v);
const log = {
  info: (m, c) => console.log(m, c !== undefined ? JSON.stringify(c) : ''),
  error: (m, c) => console.error(m, c !== undefined ? JSON.stringify(c) : ''),
  warning: (m, c) => console.warn(m, c !== undefined ? JSON.stringify(c) : ''),
};

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

async function dispatchPostPaymentJobs(bookingId, ctx) {
  try {
    await queue.dispatchNow('SendInvoiceWhatsAppJob', { bookingId });
  } catch (e) {
    log.error(`WhatsApp invoice send failed (${ctx})`, { booking_id: bookingId, error: e.message });
  }
  // Subscription welcome - no-ops unless this booking has a monthly-subscription line.
  try {
    await queue.dispatchNow('SendSubscriptionWelcomeWhatsAppJob', { bookingId });
  } catch (e) {
    log.error(`WhatsApp subscription welcome failed (${ctx})`, { booking_id: bookingId, error: e.message });
  }
}

async function saveTransaction(payment, event) {
  php.assertString(event); // saveTransaction(array $payment, string $event): TypeError for null/array event
  if (!notEmpty(payment && payment.id)) {
    log.warning('Razorpay webhook: empty payment entity');
    return;
  }
  let userId = null;

  // Step 1 - booking_id from notes
  const bookingId = get(payment, 'notes.booking_id');
  if (bookingId) {
    const booking = await Booking.findByPk(bookingId);
    userId = booking ? booking.customer_id : null;
  }

  // Step 2 - phone match
  if (!userId && notEmpty(payment.contact)) {
    const phone = PhoneHelper.normalize(payment.contact);
    if (phone) {
      const user = await User.findOne({ where: sequelize.where(sequelize.fn('RIGHT', sequelize.col('phone'), 10), phone) });
      userId = user ? user.id : null;
    }
  }

  // Step 3 - order_id match
  if (!userId && notEmpty(payment.order_id)) {
    const booking = await Booking.findOne({ where: { [Op.or]: [{ razorpay_link_id: payment.order_id }, { payment_ref: payment.id }] } });
    userId = booking ? booking.customer_id : null;
  }

  const rs = payment.refund_status || '';
  let status;
  if (rs === 'full') status = 'refunded';
  else if (rs === 'partial') status = 'partially_refunded';
  else if (['captured', 'failed', 'refunded', 'authorized'].includes(payment.status || '')) status = payment.status;
  else if (String(event || '').includes('captured')) status = 'captured';
  else if (String(event || '').includes('failed')) status = 'failed';
  else status = payment.status || 'unknown';

  const paidAt = payment.created_at !== undefined && payment.created_at !== null
    ? dayjs.unix(parseInt(payment.created_at, 10)).toDate()
    : new Date();

  const values = {
    amount: php.div100(payment.amount),
    amount_refunded: php.div100(payment.amount_refunded),
    currency: payment.currency || 'INR',
    method: payment.method || null,
    status,
    contact: payment.contact || null,
    email: payment.email || null,
    description: payment.description || null,
    order_id: payment.order_id || null,
    user_id: userId,
    paid_at: paidAt,
  };
  const existing = await Transaction.findOne({ where: { payment_id: payment.id } });
  if (existing) await existing.update(values);
  else await Transaction.create({ payment_id: payment.id, ...values });

  log.info('Razorpay webhook: Transaction saved', { payment_id: payment.id, status, event, user_id: userId, amount: values.amount });
}

async function resolveBooking(orderId, receipt, payment, t) {
  php.assertNullableString(orderId); php.assertNullableString(receipt);
  const opts = { transaction: t, lock: t.LOCK.UPDATE };
  // 1 - booking_id from notes
  const bookingId = get(payment, 'notes.booking_id');
  if (bookingId) {
    const b = await Booking.findByPk(bookingId, opts);
    if (b) return b;
  }
  // 2 - razorpay_order_id (web checkout flow)
  if (php.truthy(orderId)) {
    const b = await Booking.findOne({ where: { razorpay_order_id: orderId }, ...opts });
    if (b) return b;
  }
  // 3 - order receipt: payment_ref or BOOKING_<id>
  if (php.truthy(receipt)) {
    let b = await Booking.findOne({ where: { payment_ref: receipt }, ...opts });
    if (b) return b;
    const m = String(receipt).match(/^(?:BOOKING|booking)_(\d+)/i);
    if (m) {
      b = await Booking.findByPk(m[1], opts);
      if (b) return b;
    }
  }
  return null;
}

async function fulfilFromOrder(res, event, payment, order) {
  php.assertNullableArray(payment); php.assertNullableArray(order); // ?array params: TypeError (outside the try) for scalar entities
  const orderId = get(order, 'id') ?? get(payment, 'order_id');
  const receipt = get(order, 'receipt');
  const paymentId = get(payment, 'id');
  const t = await sequelize.transaction();
  let committed = false;
  try {
    // EXTENSION PAYMENT - receipt "EXT_<id>_..."
    if (php.truthy(receipt) && php.isArr(receipt)) throw new TypeError('preg_match(): Argument #2 ($subject) must be of type string, array given');
    const em = php.truthy(receipt) ? String(receipt).match(/^EXT_(\d+)/i) : null;
    if (em) {
      const extension = await BookingExtension.findByPk(em[1], { transaction: t, lock: t.LOCK.UPDATE });
      if (extension) {
        if (extension.payment_status === 'paid') {
          await t.rollback();
          log.info('Razorpay webhook (fallback): Extension already processed', { extension_id: extension.id });
          return res.json({ already_processed: true });
        }
        await extension.update({ payment_status: 'paid', paid_at: new Date() }, { transaction: t });
        const booking = await Booking.findByPk(extension.booking_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (booking) {
          await booking.update({
            service_end_at: dayjs(booking.service_end_at).add(extension.duration_minutes, 'minute').toDate(),
            extension_count: (parseInt(booking.extension_count, 10) || 0) + 1,
            reminder_sent_at: null,
            end_reminder_15_sent_at: null,
          }, { transaction: t });
        }
        await t.commit();
        log.info('Razorpay webhook (fallback): Extension success', { extension_id: extension.id, booking_id: extension.booking_id });
        return res.json({ extension_success: true });
      }
    }

    // NORMAL BOOKING PAYMENT
    const booking = await resolveBooking(orderId, receipt, payment, t);
    if (!booking) {
      await t.rollback();
      log.error('Razorpay webhook (fallback): Booking not found', { event, order_id: orderId, receipt });
      return res.json({ not_found: true });
    }
    if (booking.payment_status === Booking.PAYMENT_PAID) {
      await t.rollback();
      log.info('Razorpay webhook (fallback): Booking already paid', { booking_id: booking.id });
      return res.json({ already_paid: true });
    }
    await booking.update({ payment_status: Booking.PAYMENT_PAID, razorpay_payment_id: paymentId, paid_at: new Date() }, { transaction: t });
    await t.commit();
    committed = true;

    await dispatchPostPaymentJobs(booking.id, 'fallback');
    log.info('Razorpay webhook (fallback): Booking success', { booking_id: booking.id, payment_id: paymentId });
    return res.json({ booking_success: true });
  } catch (e) {
    if (!committed) { try { await t.rollback(); } catch (_) { /* already finished */ } }
    log.error('Razorpay webhook (fallback): Exception', { error: e.message, trace: e.stack });
    return res.status(500).json({ error: true });
  }
}

const handle = async (req, res) => {
  log.info('Razorpay webhook HIT', req.all());

  // SIGNATURE VERIFICATION
  const signature = req.headers['x-razorpay-signature'];
  const secret = config.razorpay.webhookSecret || '';
  const raw = req.rawBody || Buffer.from('');
  if (!signature || !safeEqual(crypto.createHmac('sha256', secret).update(raw).digest('hex'), signature)) {
    log.error('Razorpay webhook: Invalid signature');
    return res.status(403).send('Invalid signature');
  }

  const event = req.input('event');
  const paymentEntity = req.input('payload.payment.entity');
  const orderEntity = req.input('payload.order.entity');
  const refundEntity = req.input('payload.refund.entity');

  log.info('Razorpay webhook: Event received', { event });

  // HANDLE REFUND EVENTS FIRST (so status stays refunded)
  if (notEmpty(get(refundEntity, 'payment_id'))) {
    const refundAmount = php.div100(refundEntity.amount);
    const row = await Transaction.findOne({ where: { payment_id: refundEntity.payment_id }, attributes: ['amount'] });
    const totalAmount = row && row.amount !== null ? Number(row.amount) : 0;
    const refundStatus = refundAmount >= totalAmount ? 'refunded' : 'partially_refunded';
    await Transaction.update({ amount_refunded: refundAmount, status: refundStatus }, { where: { payment_id: refundEntity.payment_id } });
    log.info('Razorpay webhook: Refund updated', { payment_id: refundEntity.payment_id, amount_refunded: refundAmount, status: refundStatus });
    return res.json({ refund_saved: true });
  }

  // SAVE PAYMENT TRANSACTION (non-refund events only)
  if (notEmpty(get(paymentEntity, 'id'))) await saveTransaction(paymentEntity, event);

  // BOOKING LOGIC - only for payment_link.paid
  if (event === 'payment_link.paid') {
    const linkId = req.input('payload.payment_link.entity.id');
    if (!php.truthy(linkId)) {
      log.error('Razorpay webhook: payment_link id missing');
      return res.json({ invalid_payload: true });
    }

    const t = await sequelize.transaction();
    let committed = false;
    try {
      // CHECK EXTENSION PAYMENT
      const extension = await BookingExtension.findOne({ where: { razorpay_link_id: linkId }, transaction: t, lock: t.LOCK.UPDATE });
      if (extension) {
        if (extension.payment_status === 'paid') {
          await t.rollback();
          log.info('Razorpay webhook: Extension already processed', { extension_id: extension.id });
          return res.json({ already_processed: true });
        }
        await extension.update({ payment_status: 'paid', paid_at: new Date() }, { transaction: t });
        const booking = await Booking.findByPk(extension.booking_id, { transaction: t, lock: t.LOCK.UPDATE });
        await booking.update({
          service_end_at: dayjs(booking.service_end_at).add(extension.duration_minutes, 'minute').toDate(),
          extension_count: (parseInt(booking.extension_count, 10) || 0) + 1,
          reminder_sent_at: null,
        }, { transaction: t });
        await t.commit();
        log.info('Razorpay webhook: Extension success', { extension_id: extension.id, booking_id: booking.id });
        return res.json({ extension_success: true });
      }

      // CHECK NORMAL BOOKING PAYMENT
      const booking = await Booking.findOne({ where: { razorpay_link_id: linkId }, transaction: t, lock: t.LOCK.UPDATE });
      if (!booking) {
        await t.rollback();
        log.error('Razorpay webhook: Booking not found', { link_id: linkId });
        return res.json({ not_found: true });
      }
      if (booking.payment_status === Booking.PAYMENT_PAID) {
        await t.rollback();
        log.info('Razorpay webhook: Booking already paid', { booking_id: booking.id });
        return res.json({ already_paid: true });
      }
      await booking.update({ payment_status: Booking.PAYMENT_PAID, payment_ref: get(paymentEntity, 'id'), paid_at: new Date() }, { transaction: t });
      await t.commit();
      committed = true;

      await dispatchPostPaymentJobs(booking.id, 'payment_link.paid');
      log.info('Razorpay webhook: Booking success', { booking_id: booking.id, payment_id: get(paymentEntity, 'id') });
      return res.json({ booking_success: true });
    } catch (e) {
      if (!committed) { try { await t.rollback(); } catch (_) { /* already finished */ } }
      log.error('Razorpay webhook: Exception', { error: e.message, trace: e.stack });
      return res.status(500).json({ error: true });
    }
  }

  // FALLBACK FULFILMENT (order.paid / payment.captured)
  if (['order.paid', 'payment.captured'].includes(event)) {
    return fulfilFromOrder(res, event, paymentEntity, orderEntity);
  }

  return res.json({ success: true });
};

module.exports = { handle };
