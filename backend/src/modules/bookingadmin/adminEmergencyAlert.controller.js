// Port of App\Http\Controllers\Api\Admin\AdminEmergencyAlertController
// City scoping: super-admin sees every city's alerts; city-admin / co-ordinators only their own users.city_id.
const { EmergencyAlert, User } = require('../../models');
const paginate = require('../../utils/paginate');
const validate = require('../../utils/validate');
const { HttpError } = require('../../utils/errors');
const { dayjs } = require('../../utils/time');

const isSuperAdmin = (user) => !!(user && user.role && user.role.slug === 'super-admin');

const includes = () => [
  { model: User, as: 'worker', attributes: ['id', 'name', 'phone'], required: false },
  { association: 'booking', attributes: ['id', 'city_id', 'customer_id'], required: false },
  { model: User, as: 'handledBy', attributes: ['id', 'name'], required: false },
];

// Restrict the query to the responder's city unless they are super-admin.
const scopeWhere = (user, where = {}) => {
  if (user && !isSuperAdmin(user)) where.city_id = user.city_id;
  return where;
};

// Fetch an alert the responder is allowed to act on, or 404.
async function findAccessibleOrFail(user, id, opts = {}) {
  const row = /^\d+$/.test(String(id))
    ? await EmergencyAlert.findOne({ where: scopeWhere(user, { id }), ...opts })
    : null;
  if (!row) throw new HttpError(404, `No query results for model [App\\Models\\EmergencyAlert] ${id}`);
  return row;
}

// Eloquent serialises the handledBy relation as 'handled_by' (overriding the handled_by column).
const shape = (alert) => {
  const j = alert.toJSON();
  if ('handledBy' in j) { j.handled_by = j.handledBy; delete j.handledBy; }
  return j;
};

// PHP `int $id` route parameter (coercive mode): '1.5' -> 1, non-numeric -> TypeError (500)
const intParam = (id) => {
  const s = String(id);
  if (/^-?\d+$/.test(s)) return s;
  if (s.trim() !== '' && !isNaN(Number(s))) return String(Math.trunc(Number(s)));
  throw new Error('Argument #2 ($id) must be of type int, string given');
};

const AdminEmergencyAlertController = {
  // GET /admin/emergency-alerts   (?status=pending|acknowledged|resolved)
  async index(req, res) {
    await validate(req, { status: 'nullable|in:pending,acknowledged,resolved' });

    const where = scopeWhere(req.user);
    if (req.filled('status')) where.status = req.input('status');

    const alerts = await paginate(EmergencyAlert, req, {
      where,
      include: includes(),
      order: [['created_at', 'DESC']],
      perPage: 20,
    });

    alerts.data = alerts.data.map(shape);
    return res.json({ success: true, data: alerts });
  },

  // GET /admin/emergency-alerts/{alert}
  async show(req, res) {
    const alert = await findAccessibleOrFail(req.user, intParam(req.params.alert), { include: includes() });

    return res.json({ success: true, data: shape(alert) });
  },

  // POST /admin/emergency-alerts/{alert}/acknowledge
  async acknowledge(req, res) {
    const alertId = intParam(req.params.alert);
    await validate(req, { note: 'nullable|string|max:1000' });

    const responder = req.user;
    const alert = await findAccessibleOrFail(responder, alertId);

    if (alert.status === 'resolved') {
      return res.status(409).json({ success: false, message: 'This alert is already resolved.' });
    }

    await alert.update({
      status: 'acknowledged',
      handled_by: responder.id,
      handled_note: req.input('note', alert.handled_note),
      handled_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

    console.log('Emergency alert ACKNOWLEDGED', { alert_id: alert.id, handled_by: responder.id });

    await alert.reload();
    return res.json({ success: true, message: 'Alert acknowledged.', data: alert });
  },

  // POST /admin/emergency-alerts/{alert}/resolve
  async resolve(req, res) {
    const alertId = intParam(req.params.alert);
    await validate(req, { note: 'nullable|string|max:1000' });

    const responder = req.user;
    const alert = await findAccessibleOrFail(responder, alertId);

    if (alert.status === 'resolved') {
      return res.status(409).json({ success: false, message: 'This alert is already resolved.' });
    }

    await alert.update({
      status: 'resolved',
      handled_by: responder.id,
      handled_note: req.input('note', alert.handled_note),
      handled_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

    console.log('Emergency alert RESOLVED', { alert_id: alert.id, handled_by: responder.id });

    await alert.reload();
    return res.json({ success: true, message: 'Alert resolved.', data: alert });
  },
};

module.exports = AdminEmergencyAlertController;
