// Port of App\Http\Controllers\WhatsAppController (the commented-out older sendBookingDetails variants are not ported)
const { User, Booking, Service } = require('../../models');
const { dayjs } = require('../../utils/time');
const { validateSendBookingWhatsApp } = require('./requests/sendBookingWhatsApp');

// role_id for coordinator
const COORDINATOR_ROLE_ID = 6;

const getWhatsAppService = () => require('../../services/WhatsAppService');

// PHP number_format($n, 2)
const numberFormat2 = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// PHP urlencode()
const urlencode = (s) => encodeURIComponent(s).replace(/%20/g, '+').replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const ucfirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const modelNotFound = (name, id) => new Error(`No query results for model [App\\Models\\${name}]${id === undefined ? '.' : ' ' + id}`);

const ctrl = {
  // GET /api/coordinators - Fetch all users with role_id = 6 for dropdown
  async getCoordinators(req, res) {
    try {
      const coordinators = await User.findAll({
        where: { role_id: COORDINATOR_ROLE_ID, is_active: 1 },
        attributes: ['id', 'name', 'phone'],
        order: [['name', 'ASC']],
      });

      return res.status(200).json({ success: true, coordinators });
    } catch (e) {
      console.error('getCoordinators error', { message: e.message });

      return res.status(500).json({ success: false, message: 'Failed to fetch coordinators.', error: e.message });
    }
  },

  // POST /api/whatsapp/send-booking - Send booking + customer details to selected coordinator via WhatsApp
  async sendBookingDetails(req, res) {
    // FormRequest validation (outside the try/catch in PHP)
    await validateSendBookingWhatsApp(req);

    try {
      // 1. Fetch coordinator (user with role_id = 6)
      const coordinator = await User.findOne({ where: { id: req.input('coordinator_id'), role_id: COORDINATOR_ROLE_ID } });
      if (!coordinator) throw modelNotFound('User');

      if (!coordinator.phone) {
        return res.status(422).json({
          success: false,
          message: `Coordinator ${coordinator.name} does not have a phone number.`,
        });
      }

      // 2. Fetch booking with all relationships
      const booking = await Booking.findByPk(req.input('booking_id'), {
        include: [
          { model: User, as: 'customer', required: false },
          { model: Service, as: 'service', required: false },
          { model: User, as: 'worker', required: false },
        ],
      });
      if (!booking) throw modelNotFound('Booking', req.input('booking_id'));

      // 3. Build date & time from booking_date + time_slot
      const bookingDate = booking.booking_date ?? null;
      const timeSlot = booking.time_slot ?? null;
      const datetime = (bookingDate && timeSlot)
        ? dayjs(bookingDate).format('DD-MM-YYYY') + ' ' + timeSlot
        : (bookingDate ? dayjs(bookingDate).format('DD-MM-YYYY') : 'N/A');

      // 4. Build Google Maps link from address in bookings table
      const address = booking.address ?? 'N/A';
      const mapsLink = address !== 'N/A'
        ? 'https://www.google.com/maps/search/?api=1&query=' + urlencode(address)
        : 'N/A';

      // 5. Build customer data
      const customerData = {
        name: booking.customer?.name ?? 'N/A',
        phone: booking.customer?.phone ?? 'N/A',
      };

      // 6. Build booking data
      const bookingData = {
        service: booking.service?.name ?? booking.service_name ?? 'N/A',
        worker: booking.worker?.name ?? 'N/A',
        datetime,
        amount: '₹' + numberFormat2(booking.amount),
        status: String(booking.payment_status ?? 'UNPAID').toUpperCase() + ' - ' + ucfirst(booking.status ?? 'Pending'),
        address,
        location: mapsLink,
      };

      // 7. Send WhatsApp template
      const result = await getWhatsAppService().sendBookingTemplate(coordinator.phone, coordinator.name, customerData, bookingData);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: `Booking details sent to ${coordinator.name} on WhatsApp!`,
          data: result.data,
        });
      }

      return res.status(500).json({ success: false, message: 'Failed to send WhatsApp message.', error: result.error });
    } catch (e) {
      console.error('sendBookingDetails error', { message: e.message });

      return res.status(500).json({ success: false, message: 'Something went wrong.', error: e.message });
    }
  },
};

ctrl.COORDINATOR_ROLE_ID = COORDINATOR_ROLE_ID;

module.exports = ctrl;
