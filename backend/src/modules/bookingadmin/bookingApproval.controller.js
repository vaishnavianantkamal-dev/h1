// Port of App\Http\Controllers\Booking\BookingApprovalController
// (only approve() is routed: POST /admin/bookings/{booking}/approve; reject() is ported but unrouted, as in PHP)
const { Booking, Service } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');

const FMT = 'YYYY-MM-DD HH:mm:ss';
const fcm = () => require('../../services/FirebaseNotificationService');

const BookingApprovalController = {
  async approve(req, res) {
    // PHP injects FirebaseNotificationService into the action: constructing it throws without credentials (500)
    require('../../services/FirebaseService').requireNotificationService();
    const booking = await findOrFail(Booking, req.params.booking);

    // Only pending bookings can be approved
    if (booking.status !== 'pending') {
      return res.status(422).json({ success: false, message: 'Only pending bookings can be approved.' });
    }

    await booking.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: dayjs().format(FMT),
    });

    // Send notification to customer about booking approval
    if (booking.customer_id) {
      await fcm().sendBookingStatusChanged(booking.id, 'approved', booking.customer_id);
    }

    // Send notification to all available workers about new booking
    const service = booking.service_id ? await Service.findByPk(booking.service_id) : null;
    const serviceCategoryId = (service && service.category_id) || null;
    await fcm().sendNewBookingToWorkers(booking.id, serviceCategoryId);

    return res.json({
      success: true,
      message: 'Booking approved successfully.',
      data: {
        booking_id: booking.id,
        status: booking.status,
        approved_by: booking.approved_by,
        approved_at: booking.approved_at,
      },
    });
  },

  async reject(req, res) {
    require('../../services/FirebaseService').requireNotificationService();
    const booking = await findOrFail(Booking, req.params.booking);

    await validate(req, { reason: 'nullable|string|max:255' });

    // Only pending bookings can be rejected
    if (booking.status !== 'pending') {
      return res.status(422).json({ success: false, message: 'Only pending bookings can be rejected.' });
    }

    await booking.update({
      status: 'rejected',
      approved_by: req.user.id,
      approved_at: dayjs().format(FMT),
    });

    if (booking.customer_id) {
      await fcm().sendBookingStatusChanged(booking.id, 'rejected', booking.customer_id);
    }

    return res.json({
      success: true,
      message: 'Booking rejected successfully.',
      data: {
        booking_id: booking.id,
        status: booking.status,
        approved_by: booking.approved_by,
        approved_at: booking.approved_at,
        reason: req.input('reason'),
      },
    });
  },
};

module.exports = BookingApprovalController;
