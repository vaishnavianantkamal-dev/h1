// Port of App\Http\Controllers\Admin\BookingAlertController
const { Op } = require('sequelize');
const { BookingAlert, Booking, User } = require('../../models');
const validate = require('../../utils/validate');
const { getScopedCityId } = require('../../utils/cityScoped');
const { sequelize } = require('./_helpers');

// whereHas('booking', b => b.where('city_id', cityId))  as an id-subquery on booking_alerts
const cityCond = (cityId) =>
  sequelize.literal(`\`booking_id\` IN (SELECT id FROM bookings WHERE city_id = ${sequelize.escape(cityId)})`);

const BookingAlertController = {
  // GET /alerts - fetch unread alerts
  async index(req, res) {
    const cityId = getScopedCityId(req);

    const rows = await BookingAlert.findAll({
      where: { is_read: false },
      include: [{
        model: Booking, as: 'booking', required: !!cityId,
        where: cityId ? { city_id: cityId } : undefined,
        include: [
          { model: User, as: 'worker', required: false },
          { model: User, as: 'customer', required: false },
        ],
      }],
      order: [['created_at', 'DESC']],
    });

    const alerts = rows.map((alert) => ({
      id: alert.id,
      booking_id: alert.booking_id,
      message: alert.message,
      is_read: alert.is_read,
      alert_sent_at: alert.toJSON().alert_sent_at, // raw (un-cast) timestamp string like Eloquent
      booking_date: alert.booking?.booking_date ?? null,
      time_slot: alert.booking?.time_slot ?? null,
      customer_name: alert.booking?.customer_name ?? null,
      worker_name: alert.booking?.worker?.name ?? null,
      address: alert.booking?.address ?? null,
      status: alert.booking?.status ?? null,
    }));

    return res.json({ success: true, unread_count: alerts.length, alerts });
  },

  // POST /alerts/mark-read - mark one or all as read
  async markRead(req, res) {
    await validate(req, {
      alert_ids: 'nullable|array',
      'alert_ids.*': 'integer|exists:booking_alerts,id',
      mark_all: 'nullable|boolean',
    });

    const cityId = getScopedCityId(req);
    const and = [];
    if (cityId) and.push(cityCond(cityId));

    if (req.boolean('mark_all')) {
      and.push({ is_read: false });
      await BookingAlert.update({ is_read: true }, { where: { [Op.and]: and } });
    } else {
      if (req.input('alert_ids') === null || req.input('alert_ids') === undefined) {
        const msg = 'The alert ids field is required when mark all is not present.';
        return res.status(422).json({ message: msg, errors: { alert_ids: [msg] } });
      }
      and.push({ id: req.input('alert_ids') });
      await BookingAlert.update({ is_read: true }, { where: { [Op.and]: and } });
    }

    return res.json({ success: true, message: 'Alerts marked as read' });
  },
};

module.exports = BookingAlertController;
