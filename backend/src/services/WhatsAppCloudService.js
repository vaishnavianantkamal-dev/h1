// Port of app/Services/WhatsAppCloudService.php (static methods -> exported functions)
const axios = require('axios');
const config = require('../config');

const http = axios.create({ validateStatus: () => true });
const ok = (res) => res.status >= 200 && res.status < 300;
const messagesUrl = () => `${config.whatsapp.cloudApiUrl}/${config.whatsapp.phoneNumberId}/messages`;
const authHeaders = () => ({ Authorization: `Bearer ${config.whatsapp.accessToken}` });

function normalize(number) {
  number = String(number === null || number === undefined ? '' : number).replace(/\D/g, '');
  return number.length === 10 ? '91' + number : number;
}

/**
 * Make a value safe to send as a template parameter: Meta rejects blank params and params
 * containing newlines, tabs, or 5+ consecutive spaces.
 */
function param(value, fallback) {
  const clean = String(value === null || value === undefined ? '' : value).replace(/\s+/g, ' ').trim();
  return clean !== '' ? clean : fallback;
}

/** @param {string[]} bodyParams positional {{1}}, {{2}}, ... text params */
async function sendTemplate(templateName, phone, bodyParams) {
  try {
    const response = await http.post(messagesUrl(), {
      messaging_product: 'whatsapp',
      to: normalize(phone),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: [{ type: 'body', parameters: bodyParams.map((p) => ({ type: 'text', text: String(p) })) }],
      },
    }, { headers: authHeaders() });

    console.log('WhatsApp template sent', { template: templateName, status: response.status });
    return ok(response);
  } catch (e) {
    console.error('WhatsApp template send failed', { template: templateName, error: e.message });
    return false;
  }
}

async function sendInvoiceTemplate(booking, invoiceUrl) {
  try {
    // PHP: normalize(string $number) throws TypeError for a null customer_phone (caught below -> false, nothing sent)
    if (booking.customer_phone === null || booking.customer_phone === undefined) throw new TypeError('normalize(): Argument #1 ($number) must be of type string, null given');
    const phone = normalize(booking.customer_phone);
    // Force URL correction
    invoiceUrl = String(invoiceUrl).split('public/storage/invoices/').join('storage/app/public/invoices/');

    const service = booking.service || (typeof booking.getService === 'function' ? await booking.getService() : null);

    const response = await http.post(messagesUrl(), {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'booking_confirmed_invoice_text',
        language: { code: 'en_US' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: String(booking.invoice_number ?? '') },
            { type: 'text', text: service.name },
            { type: 'text', text: String(require('../models/serializer').attr('Booking', 'amount', booking.amount) ?? '') }, // Eloquent decimal:2 cast -> "600.00"
            { type: 'text', text: invoiceUrl },
          ],
        }],
      },
    }, { headers: authHeaders() });

    console.log('WhatsApp invoice template sent', { booking_id: booking.id, status: response.status });
    return ok(response);
  } catch (e) {
    console.error('WhatsApp send failed', { booking_id: booking.id, error: e.message });
    return false;
  }
}

// Template NOT YET CREATED IN META for the four below (see PHP comments): 4 body params
// {{1}} customer name, {{2}} service name, {{3}} category name, {{4}} end date.
function sendMembershipExpiringTemplate(phone, customerName, serviceName, categoryName, endDate) {
  return sendTemplate('membership_expiring_reminder', phone, [
    param(customerName, 'Customer'),
    param(serviceName, 'Daily service'),
    param(categoryName, 'Monthly Subscription'),
    param(endDate, '-'),
  ]);
}

function sendMembershipExpiredTemplate(phone, customerName, serviceName, categoryName, endDate) {
  return sendTemplate('membership_expired_notice', phone, [
    param(customerName, 'Customer'),
    param(serviceName, 'Daily service'),
    param(categoryName, 'Monthly Subscription'),
    param(endDate, '-'),
  ]);
}

// 6 params: customer name, service name, category name, duration days, start date, end date
function sendSubscriptionStartedTemplate(phone, customerName, serviceName, categoryName, durationDays, startDate, endDate) {
  return sendTemplate('subscription_started', phone, [
    param(customerName, 'Customer'),
    param(serviceName, 'Daily service'),
    param(categoryName, 'Monthly Subscription'),
    param(durationDays, '30'),
    param(startDate, '-'),
    param(endDate, '-'),
  ]);
}

// 4 params: customer name, service name, new schedule, new time slot
function sendBookingRescheduledTemplate(phone, customerName, serviceName, newSchedule, newTimeSlot) {
  return sendTemplate('booking_reschedule_notification', phone, [
    param(customerName, 'Customer'),
    param(serviceName, 'Your service'),
    param(newSchedule, '-'),
    param(newTimeSlot, '-'),
  ]);
}

module.exports = {
  sendInvoiceTemplate,
  sendMembershipExpiringTemplate,
  sendMembershipExpiredTemplate,
  sendSubscriptionStartedTemplate,
  sendBookingRescheduledTemplate,
};
