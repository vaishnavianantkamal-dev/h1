// Port of App\Http\Controllers\Notification\NotificationController (admin booking notifications)
const { Booking, Service, ServiceCategory, User } = require('../../models');
const { dayjs } = require('../../utils/time');

// Carbon::createFromFormat('d/m/Y') with fallback to Carbon::parse
function parseBookingDate(value) {
  const strict = dayjs(String(value), 'DD/MM/YYYY', true);
  return strict.isValid() ? strict : dayjs(value);
}

const dateLabel = (date) => {
  const today = dayjs();
  if (date.isSame(today, 'day')) return 'Today';
  if (date.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
  return date.format('DD MMM YYYY');
};

const ctrl = {
  async index(req, res) {
    const totalCount = await Booking.count({ where: { is_seen: false } });

    const bookings = await Booking.findAll({
      where: { is_seen: false },
      include: [
        { model: Service, as: 'service', required: false, include: [{ model: ServiceCategory, as: 'category', required: false }] },
        { model: User, as: 'customer', required: false },
      ],
      order: [['created_at', 'DESC']],
    });

    const notifications = bookings.map((booking) => {
      const date = parseBookingDate(booking.booking_date);
      const serviceName = booking.service?.name ?? 'Unknown Service';
      const customerName = booking.customer?.name ?? 'Unknown Customer';
      const categoryName = booking.service?.category?.name ?? 'Unknown Category';

      return {
        id: booking.id,
        title: 'New Booking #' + booking.id,
        message: serviceName + ' request from ' + customerName,
        category: categoryName,
        date_label: dateLabel(date),
        time_slot: booking.time_slot,
        is_read: !!booking.is_seen,
      };
    });

    return res.json({ success: true, total_count: totalCount, data: notifications });
  },

  async markAsRead(req, res) {
    const booking = await Booking.findByPk(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.is_seen) {
      await booking.update({ is_seen: true });
    }

    // updated unread count
    const unreadCount = await Booking.count({ where: { is_seen: false } });

    return res.json({ success: true, message: 'Notification marked as read', unread_count: unreadCount });
  },
};

module.exports = ctrl;
