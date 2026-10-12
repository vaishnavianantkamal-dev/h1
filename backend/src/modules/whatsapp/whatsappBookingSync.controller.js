// Port of App\Http\Controllers\Api\WhatsappBookingSyncController.
// NOTE: no route in routes/api.php references it (and WhatsappFlowParser / App\Services\BookingService do not exist
// in the PHP project, nor does config/whatsapp_services.php), so it is NOT mounted. Kept for parity.
const validate = require('../../utils/validate');
const config = require('../../config');

const ctrl = {
  async sync(req, res) {
    await validate(req, {
      company_id: 'required|integer',
      flow_id: 'required|string',
      form_data: 'required|array',
    });

    const WhatsappFlowParser = require('../../services/WhatsappFlowParser');
    const bookingService = require('../../services/BookingService');

    const parsed = WhatsappFlowParser.parse(req.input('form_data'));

    // config('whatsapp_services.' . $key) - config file absent in PHP, so this resolves to null there
    const serviceId = (config.whatsappServices || {})[parsed.service.service_key];

    if (!serviceId) {
      return res.status(422).json({ success: false, message: 'Service mapping not found' });
    }

    const booking = await bookingService.create({
      phone: parsed.phone,
      customer_name: parsed.customer_name,
      service_id: serviceId,
      booking_date: parsed.booking_date,
      time_slot: parsed.time_slot,
      address: 'Collected via WhatsApp',
      source: 'whatsapp',
      bot_session_id: parsed.bot_session_id ?? req.input('flow_id'),
    });

    if (!booking) {
      return res.json({ success: true, message: 'Already synced' });
    }

    return res.json({ success: true, booking_id: booking.id, amount: booking.amount, status: booking.status });
  },
};

module.exports = ctrl;
