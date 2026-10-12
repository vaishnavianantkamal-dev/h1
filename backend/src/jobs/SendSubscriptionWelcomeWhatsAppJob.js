// PHP: SendSubscriptionWelcomeWhatsAppJob::dispatch($bookingId)  -> payload { bookingId }
// "Welcome to Hobit" WhatsApp message, sent once when a MONTHLY SUBSCRIPTION booking is confirmed paid.
// No-ops for every non-subscription booking.
const queue = require('./queue');
const { Booking, BookingService, Service, ServiceCategory, ServicePlan } = require('../models');
const { dayjs } = require('../utils/time');
const WhatsAppCloudService = require('../services/WhatsAppCloudService');

async function handle({ bookingId } = {}) {
  const booking = await Booking.findByPk(bookingId, {
    include: [{
      model: BookingService, as: 'services',
      include: [
        { model: Service, as: 'service', include: [{ model: ServiceCategory, as: 'category' }] },
        { model: ServicePlan, as: 'servicePlan' },
      ],
    }],
    order: [[{ model: BookingService, as: 'services' }, 'id', 'ASC']],
  });

  if (!booking || booking.subscription_welcome_sent_at) return;

  if (booking.payment_status !== Booking.PAYMENT_PAID || !booking.customer_phone) return;

  // Only a real monthly-subscription line qualifies.
  const line = (booking.services || []).find((s) => BookingService.SUBSCRIPTION_TYPES.includes(s.booking_type));

  if (!line || !line.start_date || !line.end_date) return;

  const start = dayjs(line.start_date);
  const end = dayjs(line.end_date);

  // Duration: the plan's own period when booked from a plan, otherwise derived from the dates.
  // The +1 is deliberate: end_date is an INCLUSIVE service day (stored as start + (days - 1)).
  const durationDays = parseInt(
    (line.servicePlan && line.servicePlan.duration_days) || end.startOf('day').diff(start.startOf('day'), 'day') + 1,
    10
  );

  await WhatsAppCloudService.sendSubscriptionStartedTemplate(
    booking.customer_phone,
    String(booking.customer_name ?? ''),
    String(line.service?.name ?? ''),
    String(line.service?.category?.name ?? ''),
    String(durationDays),
    start.format('DD MMM YYYY'),
    end.format('DD MMM YYYY')
  );

  await booking.update({ subscription_welcome_sent_at: new Date() });

  console.log('Subscription welcome WhatsApp sent', { booking_id: booking.id, booking_service_id: line.id });
}

queue.register('SendSubscriptionWelcomeWhatsAppJob', handle);
module.exports = { handle };
