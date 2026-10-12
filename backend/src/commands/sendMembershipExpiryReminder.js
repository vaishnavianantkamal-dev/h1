// subscriptions:expiry-notify - Notify members 2 days before their subscription ends, and once after it has ended
const { Op, fn, col, where } = require('sequelize');
const { Booking, BookingService, Service, ServiceCategory, UserFcmToken } = require('../models');
const { dayjs } = require('../utils/time');
const CustomerFirebaseService = require('../services/CustomerFirebaseService');
const WhatsAppCloudService = require('../services/WhatsAppCloudService');

// Days before end_date that the "expiring soon" reminder is sent.
const REMINDER_DAYS_BEFORE = 2;

const bookingInclude = () => [
  {
    model: Booking, as: 'booking', required: true,
    where: { payment_status: Booking.PAYMENT_PAID, status: { [Op.notIn]: ['cancelled'] } },
  },
  { model: Service, as: 'service', include: [{ model: ServiceCategory, as: 'category' }] },
];

async function run() {
  const today = dayjs().format('YYYY-MM-DD');
  await sendBeforeExpiry();
  await sendAfterExpiry(today);
}

// Subscriptions ending in exactly REMINDER_DAYS_BEFORE days, not yet reminded.
async function sendBeforeExpiry() {
  const targetDate = dayjs().add(REMINDER_DAYS_BEFORE, 'day').format('YYYY-MM-DD');

  const bookingServices = await BookingService.findAll({
    where: {
      [Op.and]: [
        { booking_type: { [Op.in]: BookingService.SUBSCRIPTION_TYPES } },
        where(fn('DATE', col('BookingService.end_date')), targetDate),
        { expiry_reminder_sent_at: null },
      ],
    },
    include: bookingInclude(),
  });

  for (const bookingService of bookingServices) {
    const booking = bookingService.booking;
    if (!booking || !booking.customer_id) continue;

    const endDate = dayjs(bookingService.end_date).format('DD MMM YYYY');

    await notifyCustomer(
      booking.customer_id,
      'Your membership ends soon',
      `Your membership ends in ${REMINDER_DAYS_BEFORE} days on ${endDate}. Renew now to keep your benefits.`,
      'membership_expiring',
      bookingService.id
    );

    if (booking.customer_phone) {
      await WhatsAppCloudService.sendMembershipExpiringTemplate(
        booking.customer_phone,
        String(booking.customer_name ?? ''),
        String(bookingService.service?.name ?? ''),
        String(bookingService.service?.category?.name ?? ''),
        endDate
      );
    }

    await bookingService.update({ expiry_reminder_sent_at: new Date() });

    console.log(`BookingService #${bookingService.id}: expiry reminder sent for customer #${booking.customer_id}.`);
  }

  console.log(`Before-expiry scan done. Matched: ${bookingServices.length}.`);
}

// Subscriptions whose end_date has already passed, not yet notified.
async function sendAfterExpiry(today) {
  const bookingServices = await BookingService.findAll({
    where: {
      [Op.and]: [
        { booking_type: { [Op.in]: BookingService.SUBSCRIPTION_TYPES } },
        where(fn('DATE', col('BookingService.end_date')), '<', today),
        { expiry_expired_notice_sent_at: null },
      ],
    },
    include: bookingInclude(),
  });

  for (const bookingService of bookingServices) {
    const booking = bookingService.booking;
    if (!booking || !booking.customer_id) continue;

    const endDate = dayjs(bookingService.end_date).format('DD MMM YYYY');

    await notifyCustomer(
      booking.customer_id,
      'Your membership has ended',
      `Your membership ended on ${endDate}. Renew now to continue enjoying member benefits.`,
      'membership_expired',
      bookingService.id
    );

    if (booking.customer_phone) {
      await WhatsAppCloudService.sendMembershipExpiredTemplate(
        booking.customer_phone,
        String(booking.customer_name ?? ''),
        String(bookingService.service?.name ?? ''),
        String(bookingService.service?.category?.name ?? ''),
        endDate
      );
    }

    await bookingService.update({ expiry_expired_notice_sent_at: new Date() });

    console.log(`BookingService #${bookingService.id}: expired notice sent for customer #${booking.customer_id}.`);
  }

  console.log(`After-expiry scan done. Matched: ${bookingServices.length}.`);
}

async function notifyCustomer(customerId, title, body, type, bookingServiceId) {
  const rows = await UserFcmToken.findAll({ where: { user_id: customerId } });
  const tokens = [...new Set(rows.map((r) => r.fcm_token).filter(Boolean))];

  if (tokens.length === 0) {
    console.log('expiry-notify: no FCM tokens for customer', { customer_id: customerId });
    return;
  }

  await CustomerFirebaseService.sendToMultiple(tokens, title, body, {
    type,
    booking_service_id: String(bookingServiceId),
  });
}

module.exports = { run };
