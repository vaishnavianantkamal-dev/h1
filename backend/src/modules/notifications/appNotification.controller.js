// Port of App\Http\Controllers\Notification\AppNotificationController (mobile app notifications)
const { Booking, Service } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');

const same = (a, b) => Number(a) === Number(b);

const listFor = async (userCol, seenCol, userId) => {
  const bookings = await Booking.findAll({
    where: { [userCol]: userId },
    include: [{ model: Service, as: 'service', required: false }],
    order: [['created_at', 'DESC']],
  });

  const total = bookings.length;
  const unread = bookings.filter((b) => !b[seenCol]).length;

  const data = bookings.map((booking) => ({
    id: booking.id,
    title: 'Booking #' + booking.id,
    message: booking.service?.name ?? 'Booking update',
    status: booking.status,
    booking_date: booking.booking_date,
    time_slot: booking.time_slot,
    is_read: !!booking[seenCol],
  }));

  return { success: true, total_count: total, unread_count: unread, data };
};

const markRead = async (req, res, userCol, seenCol) => {
  const user = req.user;
  const booking = await findOrFail(Booking, req.params.booking);

  if (!same(booking[userCol], user.id)) {
    return res.status(403).json({ success: false, message: 'Not authorized to modify this booking' });
  }

  if (!booking[seenCol]) {
    await booking.update({ [seenCol]: true });
  }

  const unread = await Booking.count({ where: { [userCol]: user.id, [seenCol]: false } });

  return res.json({ success: true, message: 'Notification marked as read', unread_count: unread });
};

const ctrl = {
  // Save / update FCM token for logged-in user (customer or worker app).
  async updateToken(req, res) {
    await validate(req, { fcm_token: 'required|string|max:512' });

    const user = req.user;
    await user.update({ fcm_token: req.input('fcm_token') });

    return res.json({ success: true, message: 'FCM token updated successfully' });
  },

  async customerNotifications(req, res) {
    return res.json(await listFor('customer_id', 'customer_seen', req.user.id));
  },

  async markCustomerNotificationRead(req, res) {
    return markRead(req, res, 'customer_id', 'customer_seen');
  },

  async workerNotifications(req, res) {
    return res.json(await listFor('worker_id', 'worker_seen', req.user.id));
  },

  async markWorkerNotificationRead(req, res) {
    return markRead(req, res, 'worker_id', 'worker_seen');
  },
};

module.exports = ctrl;
