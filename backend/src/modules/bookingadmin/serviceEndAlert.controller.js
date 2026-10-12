// Port of App\Http\Controllers\Admin\ServiceEndAlertController
// Admin-facing read API for stored "service ending soon" alerts, scoped to the logged-in admin (user_id).
const { Op } = require('sequelize');
const { ServiceEndAlert, Booking } = require('../../models');
const paginate = require('../../utils/paginate');
const { dayjs } = require('../../utils/time');
const { sequelize } = require('./_helpers');

// whereDate('created_at', today)
const todayCond = (col = 'ServiceEndAlert.created_at') =>
  sequelize.where(sequelize.fn('DATE', sequelize.col(col)), dayjs().format('YYYY-MM-DD'));

const ServiceEndAlertController = {
  // GET /admin/service-end-alerts
  async index(req, res) {
    const user = req.user;

    const limit = parseInt(req.input('limit', 20), 10) || 0;
    const unread = req.input('unread'); // 'true' | 'false' | null
    if (limit < 0) throw new Error('SQLSTATE: negative LIMIT'); // paginate(-1) -> SQL error (500)

    const and = [{ user_id: user.id }, todayCond()]; // today's alerts only
    if (unread === 'true') and.push({ is_read: false });
    else if (unread === 'false') and.push({ is_read: true });

    const alerts = await paginate(ServiceEndAlert, req, {
      where: { [Op.and]: and },
      include: [{ model: Booking, as: 'booking', required: false }],
      order: [['created_at', 'DESC']],
      perPage: limit,
    });

    const unreadCount = await ServiceEndAlert.count({
      where: { [Op.and]: [{ user_id: user.id }, todayCond(), { is_read: false }] },
    });

    return res.json({
      success: true,
      total_count: alerts.total,
      unread_count: unreadCount,
      data: alerts.data.map((alert) => ({
        id: alert.id,
        title: alert.title,
        message: alert.message,
        booking_id: alert.booking_id,
        city_id: alert.city_id,
        data: alert.data,
        is_read: alert.is_read,
        created_at: alert.created_at ? dayjs(alert.created_at).format('YYYY-MM-DD HH:mm:ss') : null,
      })),
      pagination: {
        current_page: alerts.current_page,
        last_page: alerts.last_page,
        per_page: alerts.per_page,
        total: alerts.total,
      },
    });
  },

  // PUT /admin/service-end-alerts/read/{id}
  async markAsRead(req, res) {
    const user = req.user;

    const alert = await ServiceEndAlert.findOne({ where: { id: req.params.id, user_id: user.id } });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (!alert.is_read) await alert.update({ is_read: true });

    const unreadCount = await ServiceEndAlert.count({ where: { user_id: user.id, is_read: false } });

    return res.json({ success: true, message: 'Alert marked as read', unread_count: unreadCount });
  },

  // PUT /admin/service-end-alerts/read-all
  async markAllAsRead(req, res) {
    const user = req.user;

    await ServiceEndAlert.update({ is_read: true }, {
      where: { [Op.and]: [{ user_id: user.id }, todayCond('created_at'), { is_read: false }] }, // UPDATE has no table alias
    });

    return res.json({ success: true, message: 'All alerts marked as read', unread_count: 0 });
  },

  // GET /admin/service-end-alerts/unread-count
  async unreadCount(req, res) {
    const user = req.user;

    return res.json({
      success: true,
      unread_count: await ServiceEndAlert.count({
        where: { [Op.and]: [{ user_id: user.id }, todayCond(), { is_read: false }] },
      }),
    });
  },
};

module.exports = ServiceEndAlertController;
