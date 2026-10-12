// Port of App\Http\Controllers\Api\Worker\WorkerEmergencyAlertController
//
// Emergency / security ("SOS") alert raised by a worker. Stores the alert and pushes an FCM
// notification to every active super-admin and the city-admin(s) / coordinators of the worker's city.
const { Op, where: sqlWhere, fn, col } = require('sequelize');
const { EmergencyAlert, Role, User, UserFcmToken } = require('../../models');
const validate = require('../../utils/validate');
const paginate = require('../../utils/paginate');
const { dayjs } = require('../../utils/time');

function firebaseService() {
  const S = require('../../services/FirebaseService');
  return typeof S === 'function' ? new S() : S;
}

/**
 * Send the FCM push to every responder for this alert:
 *   - all active super-admins (across every city)
 *   - the city-admin(s) and coordinators of the alert's city
 */
async function notifyResponders(alert, worker) {
  const roles = await Role.findAll({ where: { slug: { [Op.in]: ['super-admin', 'city-admin', 'co-ordinators'] } } });
  const roleIds = {};
  roles.forEach((r) => { roleIds[r.slug] = r.id; });

  const superAdminRoleId = roleIds['super-admin'];
  const cityAdminRoleId = roleIds['city-admin'];
  const coordinatorRoleId = roleIds['co-ordinators'];

  // Recipients: super-admins everywhere, the others restricted to the alert's city.
  const or = [];
  if (superAdminRoleId) or.push({ role_id: superAdminRoleId });

  const cityScoped = [cityAdminRoleId, coordinatorRoleId].filter(Boolean);
  if (cityScoped.length && alert.city_id) {
    or.push({ role_id: { [Op.in]: cityScoped }, city_id: alert.city_id });
  }

  const recipientIds = (await User.findAll({
    where: or.length ? { is_active: 1, [Op.or]: or } : { is_active: 1 },
    attributes: ['id'],
  })).map((u) => u.id);

  if (!recipientIds.length) {
    console.warn('Emergency alert push NOT SENT - no responders found', { alert_id: alert.id, city_id: alert.city_id });
    return;
  }

  // FCM tokens can live in two places: user_fcm_tokens (multi-device) and users.fcm_token.
  let tokens = (await UserFcmToken.findAll({ where: { user_id: { [Op.in]: recipientIds } }, attributes: ['fcm_token'] }))
    .map((r) => r.fcm_token);

  const columnTokens = (await User.findAll({
    where: { id: { [Op.in]: recipientIds }, fcm_token: { [Op.ne]: null } },
    attributes: ['fcm_token'],
  })).map((u) => u.fcm_token);

  tokens = [...new Set([...tokens, ...columnTokens].filter(Boolean))];

  if (!tokens.length) {
    console.warn('Emergency alert push NOT SENT - responders have no FCM tokens', {
      alert_id: alert.id, recipient_count: recipientIds.length,
    });
    return;
  }

  const title = '\u{1F6A8} EMERGENCY ALERT';
  const body = `${worker.name} raised an emergency alert. Tap to respond.`;
  const s = (v) => String(v ?? '');

  try {
    await firebaseService().sendToMultiple(tokens, title, body, {
      type: 'emergency_alert',
      alert_id: String(alert.id),
      booking_id: '',
      worker_id: String(worker.id),
      worker_name: s(worker.name),
      alert_type: s(alert.alert_type),
      city_id: s(alert.city_id),
      latitude: s(alert.latitude),
      longitude: s(alert.longitude),
      message: s(alert.message),
    });

    console.log('Emergency alert push SENT to responders', {
      alert_id: alert.id, recipient_count: recipientIds.length, token_count: tokens.length,
    });
  } catch (e) {
    // Never let a push failure break the worker's SOS - the alert is already stored.
    console.error('Emergency alert push FAILED to send', { alert_id: alert.id, error: e.message });
  }
}

const ctrl = {
  /** POST /worker/emergency-alert */
  async store(req, res) {
    await validate(req, {
      // Accepted for backward compatibility with older app builds, but never used.
      booking_id: 'nullable',
      alert_type: 'nullable|in:safety,medical,accident,harassment,other',
      message: 'nullable|string|max:1000',
      latitude: 'nullable|numeric|between:-90,90',
      longitude: 'nullable|numeric|between:-180,180',
    });

    const worker = req.user;

    // Keep the table lean - retain only today's alerts, same as booking alerts.
    await EmergencyAlert.destroy({ where: sqlWhere(fn('DATE', col('created_at')), Op.lt, dayjs().format('YYYY-MM-DD')) });

    // Store the alert (always persisted, even if no one can be pushed)
    const alert = await EmergencyAlert.create({
      booking_id: null,
      worker_id: worker.id,
      customer_id: null,
      city_id: worker.city_id, // scope from the worker's profile
      alert_type: req.input('alert_type', 'safety'),
      message: req.input('message'),
      latitude: req.input('latitude'),
      longitude: req.input('longitude'),
      status: 'pending',
    });

    if (!worker.city_id) {
      // No city on the worker's profile - only super-admins will see it.
      console.warn('Emergency alert raised by worker with NO city_id', { alert_id: alert.id, worker_id: worker.id });
    }

    console.warn('EMERGENCY ALERT raised by worker', {
      alert_id: alert.id, worker_id: worker.id, city_id: alert.city_id, alert_type: alert.alert_type,
    });

    // Push to super-admin + city-admin + coordinators
    await notifyResponders(alert, worker);

    return res.status(201).json({
      success: true,
      message: 'Emergency alert sent. Help has been notified.',
      alert_id: alert.id,
      alert: {
        id: alert.id,
        booking_id: alert.booking_id,
        alert_type: alert.alert_type,
        status: alert.status,
        created_at: alert.created_at,
      },
    });
  },

  /** GET /worker/emergency-alerts - the worker's own past alerts. */
  async history(req, res) {
    const alerts = await paginate(EmergencyAlert, req, {
      where: { worker_id: req.user.id },
      order: [['created_at', 'DESC']],
      perPage: 20,
    });

    return res.json({ success: true, data: alerts });
  },
};

module.exports = ctrl;
