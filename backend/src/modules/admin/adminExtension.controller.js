// Port of App\Http\Controllers\Admin\AdminExtensionController
const { Op, literal, fn, col, where: sqlWhere } = require('sequelize');
const sequelize = require('../../config/db');
const validate = require('../../utils/validate');
const { dayjs } = require('../../utils/time');
const { BookingExtension, Booking } = require('../../models');

// Extends requested on a given day (defaults to today). GET /admin/extensions/today
async function today(req, res) {
  const admin = req.user;

  const data = await validate(req, {
    date: 'nullable|date',
    status: 'nullable|in:pending,paid,failed',
    per_page: 'nullable|integer|min:1|max:100',
  });

  const date = data.date ? dayjs(data.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

  // Base filters - reused for both the listing and the summary totals.
  const and = [sqlWhere(fn('DATE', col('BookingExtension.created_at')), date)];
  const where = {};

  if (data.status) where.payment_status = data.status;

  // City-admins, co-ordinators and contractors only see extends for bookings in their own city.
  if (admin.role && admin.role.slug !== 'super-admin') {
    const bt = Booking.getTableName();
    const cityCond = admin.city_id === null || admin.city_id === undefined
      ? `\`${bt}\`.\`city_id\` IS NULL`
      : `\`${bt}\`.\`city_id\` = ${sequelize.escape(admin.city_id)}`;
    and.push(literal(`EXISTS (SELECT 1 FROM \`${bt}\` WHERE \`${bt}\`.\`id\` = \`BookingExtension\`.\`booking_id\` AND ${cityCond})`));
  }
  where[Op.and] = and;

  const perPage = Math.max(parseInt(data.per_page ?? 15, 10) || 15, 1);
  const page = Math.max(parseInt(req.query.page ?? 1, 10) || 1, 1);

  const total = await BookingExtension.count({ where });
  const extensions = await BookingExtension.findAll({
    where,
    include: [{
      association: 'booking',
      required: false,
      attributes: ['id', 'customer_id', 'worker_id', 'service_id', 'city_id', 'booking_date', 'time_slot', 'status', 'service_end_at', 'extension_count', 'customer_name', 'customer_phone'],
      include: [
        { association: 'customer', required: false, attributes: ['id', 'name', 'phone'] },
        { association: 'worker', required: false, attributes: ['id', 'name', 'phone'] },
        { association: 'service', required: false, attributes: ['id', 'name'] },
      ],
    }],
    order: [['id', 'DESC']],
    limit: perPage,
    offset: (page - 1) * perPage,
  });

  const rows = extensions.map((extension) => {
    const booking = extension.booking || null;
    const customer = booking && booking.customer ? booking.customer : null;

    return {
      extension_id: extension.id,
      booking_id: extension.booking_id,
      customer_name: (booking && booking.customer_name) ?? (customer ? customer.name : null) ?? null,
      customer_phone: (booking && booking.customer_phone) ?? (customer ? customer.phone : null) ?? null,
      worker_name: booking && booking.worker ? booking.worker.name : null,
      worker_phone: booking && booking.worker ? booking.worker.phone : null,
      service_name: booking && booking.service ? booking.service.name : null,
      booking_date: booking ? booking.booking_date : null,
      time_slot: booking ? booking.time_slot : null,
      booking_status: booking ? booking.status : null,
      service_end_at: booking ? booking.service_end_at : null,
      extension_count: booking ? parseInt(booking.extension_count, 10) || 0 : 0,
      duration_minutes: parseInt(extension.duration_minutes, 10) || 0,
      amount: parseFloat(extension.amount) || 0,
      payment_status: extension.payment_status,
      razorpay_order_id: extension.razorpay_order_id,
      razorpay_payment_id: extension.razorpay_payment_id,
      paid_at: extension.paid_at,
      created_at: extension.created_at,
    };
  });

  // Totals for the whole day. Minutes/amount count paid extends only.
  const summary = await BookingExtension.findOne({
    where,
    attributes: [
      [literal('COUNT(*)'), 'total_extensions'],
      [literal("SUM(payment_status = 'paid')"), 'paid_count'],
      [literal("SUM(payment_status = 'pending')"), 'pending_count'],
      [literal("SUM(payment_status = 'failed')"), 'failed_count'],
      [literal("COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount END), 0)"), 'total_paid_amount'],
      [literal("COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN duration_minutes END), 0)"), 'total_minutes_extended'],
    ],
    raw: true,
  });

  const n = (v) => parseInt(v, 10) || 0;
  const f = (v) => parseFloat(v) || 0;

  return res.json({
    success: true,
    date,
    summary: {
      total_extensions: n(summary.total_extensions),
      paid_count: n(summary.paid_count),
      pending_count: n(summary.pending_count),
      failed_count: n(summary.failed_count),
      total_paid_amount: f(summary.total_paid_amount),
      total_minutes_extended: n(summary.total_minutes_extended),
    },
    data: rows,
    pagination: {
      current_page: page,
      per_page: perPage,
      total,
      last_page: Math.max(Math.ceil(total / perPage), 1),
    },
  });
}

module.exports = { today };
