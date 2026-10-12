// Port of App\Http\Controllers\Api\NotificationController.
// NOTE: its routes are commented out in routes/api.php, so this controller is NOT mounted (kept for parity).
const { Notification, User, Booking, Role } = require('../../models');
const { dayjs } = require('../../utils/time');

const ctrl = {
  // Get notifications for authenticated user
  async index(req, res) {
    const user = req.user;

    const page = Math.max(parseInt(req.input('page', 1), 10) || 1, 1);
    const limit = Math.max(parseInt(req.input('limit', 20), 10) || 20, 1);
    const type = req.input('type');
    const unread = req.input('unread');

    const where = { user_id: user.id };
    if (type) where.type = type;
    if (unread !== null && unread !== undefined) {
      if (unread === 'true') where.is_read = false;
      else if (unread === 'false') where.is_read = true;
    }

    const total = await Notification.count({ where });
    const rows = await Notification.findAll({
      where,
      include: [
        { model: User, as: 'sender', required: false, include: [{ model: Role, as: 'role', required: false }] },
        { model: Booking, as: 'booking', required: false },
        { model: User, as: 'worker', required: false },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    const unreadCount = await Notification.count({ where: { user_id: user.id, is_read: false } });

    return res.json({
      success: true,
      data: {
        notifications: rows.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : null,
          is_read: n.is_read,
          created_at: dayjs(n.created_at).format('YYYY-MM-DD HH:mm:ss'),
          sender: n.sender ? {
            id: n.sender.id,
            name: n.sender.name,
            public_id: n.sender.public_id,
            role: n.sender.role?.slug ?? 'unknown',
          } : null,
          booking: n.booking ? {
            id: n.booking.id,
            public_id: n.booking.public_id,
            status: n.booking.status,
            service_date: n.booking.service_date,
            total_amount: n.booking.total_amount,
          } : null,
          worker: n.worker ? {
            id: n.worker.id,
            name: n.worker.name,
            public_id: n.worker.public_id,
            phone: n.worker.phone,
          } : null,
        })),
        pagination: {
          current_page: page,
          last_page: Math.max(Math.ceil(total / limit), 1),
          per_page: limit,
          total,
        },
        unread_count: unreadCount,
      },
    });
  },

  async markAsRead(req, res) {
    const notification = await Notification.findOne({ where: { id: req.params.notificationId ?? req.params.id, user_id: req.user.id } });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.is_read = true;
    await notification.save();

    return res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification_id: notification.id, is_read: notification.is_read },
    });
  },

  async markAllAsRead(req, res) {
    const userId = req.user.id;
    await Notification.update({ is_read: true }, { where: { user_id: userId, is_read: false } });

    return res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updated_count: await Notification.count({ where: { user_id: userId, is_read: false } }) },
    });
  },

  async delete(req, res) {
    const notificationId = req.params.notificationId ?? req.params.id;
    const notification = await Notification.findOne({ where: { id: notificationId, user_id: req.user.id } });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.destroy();

    return res.json({ success: true, message: 'Notification deleted', data: { notification_id: notificationId } });
  },

  async getUnreadCount(req, res) {
    const unreadCount = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    return res.json({ success: true, data: { unread_count: unreadCount } });
  },

  // Create notification (helper method for other controllers)
  async createNotification(userId, type, title, message, data = null, senderId = null) {
    return Notification.create({
      user_id: userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      sender_id: senderId,
      is_read: false,
    });
  },
};

module.exports = ctrl;
