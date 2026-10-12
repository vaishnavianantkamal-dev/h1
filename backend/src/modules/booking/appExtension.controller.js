// Port of App\Http\Controllers\Api\Booking\AppExtensionController
const sequelize = require('../../config/db');
const config = require('../../config');
const validate = require('../../utils/validate');
const { dayjs } = require('../../utils/time');
const { Booking, BookingExtension, Setting, Service } = require('../../models');
const H = require('./webBooking.helpers');

// validateExtendable(): returns true when it already sent an error response
async function validateExtendable(booking, res) {
  const service = booking.service_id ? await Service.findByPk(booking.service_id) : null;

  const isInstant = service
    && Number(service.category_id) === Number(config.services.instantCategoryId);

  if (!isInstant) {
    H.failJson(res, 422, 'Extension allowed only for instant services');
    return true;
  }

  if (booking.status !== 'inprogress') {
    H.failJson(res, 422, 'Booking is not in progress');
    return true;
  }

  if (!booking.service_end_at) {
    H.failJson(res, 422, 'Service end time not set');
    return true;
  }

  return false;
}

async function options(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  if (await validateExtendable(booking, res)) return undefined;

  const durationMinutes = H.toInt(await Setting.get('extend_duration_minutes', 0));
  const price = H.toFloat(await Setting.get('extend_price', 0));

  if (durationMinutes <= 0 || price <= 0) {
    return H.failJson(res, 500, 'Extension not configured');
  }

  return res.json({
    success: true,
    data: { duration_minutes: durationMinutes, price },
  });
}

async function extend(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  if (await validateExtendable(booking, res)) return undefined;

  const durationMinutes = H.toInt(await Setting.get('extend_duration_minutes', 0));
  const price = H.toFloat(await Setting.get('extend_price', 0));

  if (durationMinutes <= 0 || price <= 0) {
    return H.failJson(res, 500, 'Extension not configured');
  }

  let extension;
  let order;
  try {
    await sequelize.transaction(async (t) => {
      extension = await BookingExtension.create({
        booking_id: booking.id,
        duration_minutes: durationMinutes,
        amount: price,
        payment_status: BookingExtension.PAYMENT_PENDING,
      }, { transaction: t });

      const razorpay = H.razorpayClient();

      order = await razorpay.orders.create({
        amount: Math.round(Number(extension.amount) * 100), // paise
        currency: 'INR',
        receipt: 'EXT_' + extension.id + '_' + Math.floor(Date.now() / 1000),
      });

      await extension.update({
        razorpay_order_id: order.id,
        payment_attempted_at: new Date(),
      }, { transaction: t });
    });
  } catch (e) {
    return H.failJson(res, 500, 'Failed to create extension');
  }

  return res.json({
    success: true,
    extension_id: extension.id,
    order_id: order.id,
    amount: extension.amount,
    currency: 'INR',
    razorpay_key: config.razorpay.key,
  });
}

async function verify(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  const data = await validate(req, {
    razorpay_order_id: 'required|string',
    razorpay_payment_id: 'required|string',
    razorpay_signature: 'required|string',
  });

  let extension = await BookingExtension.findOne({
    where: { booking_id: booking.id, razorpay_order_id: data.razorpay_order_id },
    order: [['id', 'DESC']],
  });

  if (!extension) {
    return H.failJson(res, 404, 'Extension not found for this order');
  }

  if (extension.isPaid()) {
    return res.json({ success: true, message: 'Already processed' });
  }

  const razorpay = H.razorpayClient();

  try {
    H.verifyPaymentSignature({
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
    });

    const payment = await razorpay.payments.fetch(data.razorpay_payment_id);

    if (!payment || (payment.status ?? null) !== 'captured') {
      return H.failJson(res, 422, 'Payment is not captured yet');
    }
  } catch (e) {
    console.error('Extend payment verification failed', {
      booking_id: booking.id,
      extension_id: extension.id,
      error: e.message,
    });

    return H.failJson(res, 422, 'Payment verification failed');
  }

  let alreadyProcessed = false;
  let lockedBooking;
  const extensionId = extension.id;
  try {
    await sequelize.transaction(async (t) => {
      extension = await BookingExtension.findByPk(extensionId, { lock: t.LOCK.UPDATE, transaction: t });

      if (extension.isPaid()) {
        alreadyProcessed = true;
        return;
      }

      await extension.update({
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
        payment_status: BookingExtension.PAYMENT_PAID,
        paid_at: new Date(),
      }, { transaction: t });

      lockedBooking = await Booking.findByPk(booking.id, { lock: t.LOCK.UPDATE, transaction: t });

      await lockedBooking.update({
        service_end_at: dayjs(lockedBooking.service_end_at).add(Number(extension.duration_minutes), 'minute').toDate(),
        extension_count: H.toInt(lockedBooking.extension_count) + 1,
        reminder_sent_at: null,
      }, { transaction: t });
    });
  } catch (e) {
    console.error('Extend payment apply failed', {
      booking_id: booking.id,
      extension_id: extensionId,
      error: e.message,
    });

    return H.failJson(res, 500, 'Failed to apply extension');
  }

  if (alreadyProcessed) return res.json({ success: true, message: 'Already processed' });

  return res.json({
    success: true,
    extension_id: extension.id,
    service_end_at: lockedBooking.service_end_at,
    extension_count: lockedBooking.extension_count,
  });
}

module.exports = { options, extend, verify };
