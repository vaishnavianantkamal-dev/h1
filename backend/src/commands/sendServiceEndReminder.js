// bookings:end-reminder - FCM push to customer, worker(s) and coordinator(s) 3 minutes before a service ends
const { Op, fn, col, where } = require('sequelize');
const { Booking, Service, UserFcmToken, User, Role, ServiceEndAlert } = require('../models');
const config = require('../config');
const { dayjs } = require('../utils/time');
const FirebaseService = require('../services/FirebaseService');
const CustomerFirebaseService = require('../services/CustomerFirebaseService');

// JSON array columns may come back as arrays or JSON strings
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; }
  }
  return [];
};

async function tokensForUserIds(userIds) {
  userIds = userIds.filter(Boolean);
  if (userIds.length === 0) return [];
  const rows = await UserFcmToken.findAll({ where: { user_id: { [Op.in]: userIds } } });
  return [...new Set(rows.map((r) => r.fcm_token).filter(Boolean))];
}

// FCM tokens for the booking's customer (customer Firebase project).
async function customerTokens(booking) {
  if (!booking.customer_id) return [];
  return tokensForUserIds([booking.customer_id]);
}

// FCM tokens for the booking's worker(s) and coordinator(s) (worker Firebase project).
async function staffTokens(booking) {
  const ids = [booking.worker_id, ...asArray(booking.worker_ids), ...asArray(booking.coordinator_ids)].filter(Boolean);
  return tokensForUserIds([...new Set(ids)]);
}

// Persist the service-end alert for super-admins, and city-admin / operation-head of the booking's city.
async function storeAdminAlerts(booking, title, body, data) {
  const roleId = async (slug) => {
    const r = await Role.findOne({ where: { slug }, attributes: ['id'] });
    return r ? r.id : null;
  };
  const superAdminRoleId = await roleId('super-admin');
  const cityAdminRoleId = await roleId('city-admin');
  const operationHeadRoleId = await roleId('operation-head');

  let adminIds = [];
  const pluckIds = async (w) => (await User.findAll({ where: w, attributes: ['id'] })).map((u) => u.id);

  if (superAdminRoleId) adminIds = adminIds.concat(await pluckIds({ role_id: superAdminRoleId }));
  if (cityAdminRoleId && booking.city_id) adminIds = adminIds.concat(await pluckIds({ role_id: cityAdminRoleId, city_id: booking.city_id }));
  if (operationHeadRoleId && booking.city_id) adminIds = adminIds.concat(await pluckIds({ role_id: operationHeadRoleId, city_id: booking.city_id }));

  adminIds = [...new Set(adminIds.filter(Boolean))];

  let created = 0;
  for (const adminId of adminIds) {
    const [, wasCreated] = await ServiceEndAlert.findOrCreate({
      where: { user_id: adminId, booking_id: booking.id },
      defaults: { city_id: booking.city_id, title, message: body, data, is_read: false },
    });
    if (wasCreated) created++;
  }
  return created;
}

async function run() {
  const now = dayjs();

  // Keep the admin alerts table to TODAY only: remove anything created before today.
  await ServiceEndAlert.destroy({ where: where(fn('DATE', col('created_at')), '<', now.format('YYYY-MM-DD')) });

  // All in-progress bookings whose expected end is known, not finished, and not already reminded.
  // No instant-category filter here - this covers every booking type.
  const bookings = await Booking.findAll({
    where: { status: 'inprogress', service_end_at: { [Op.ne]: null }, service_ended_at: null, end_reminder_15_sent_at: null },
    include: [{ model: Service, as: 'service' }],
  });

  // "Hobit Weekday" bookings don't run Sat/Sun, so skip alerting for that category on those two days.
  const weekdayCategoryId = config.services.weekdayCategoryId;
  const isWeekend = now.day() === 0 || now.day() === 6;

  for (const booking of bookings) {
    // Minutes remaining until the expected end (negative once past). Carbon 3 returns a signed FLOAT.
    const minutesLeft = dayjs(booking.service_end_at).diff(now, 'minute', true);

    // Fire once when 3 minutes or fewer remain (but service not yet over).
    if (minutesLeft > 3 || minutesLeft <= 0) continue;

    if (isWeekend && weekdayCategoryId && Number((booking.service && booking.service.category_id) || 0) === Number(weekdayCategoryId)) continue;

    // Customer and staff live on SEPARATE Firebase projects, so each group is sent via its own service.
    const cTokens = await customerTokens(booking);
    const sTokens = await staffTokens(booking);

    const title = 'Service ending soon';
    const body = 'This service is scheduled to end in about 3 minutes.';
    const data = { type: 'service_ending', booking_id: String(booking.id) };

    if (cTokens.length > 0) await CustomerFirebaseService.sendToMultiple(cTokens, title, body, data);
    if (sTokens.length > 0) await FirebaseService.sendToMultiple(sTokens, title, body, data);

    // Store the same alert in the DB for admins (storage only; FCM sends above are untouched).
    const adminAlerts = await storeAdminAlerts(booking, title, body, data);
    if (adminAlerts > 0) console.log(`Booking #${booking.id}: stored service-end alert for ${adminAlerts} admin(s).`);

    const sentCount = cTokens.length + sTokens.length;
    if (sentCount > 0) {
      console.log(`Booking #${booking.id}: ${parseFloat(minutesLeft.toPrecision(14))} min left → sent to ${sentCount} device(s) (customer: ${cTokens.length}, staff: ${sTokens.length}).`);
    } else {
      console.log('end-reminder: no FCM tokens for booking', { booking_id: booking.id });
      console.warn(`Booking #${booking.id}: ${parseFloat(minutesLeft.toPrecision(14))} min left → MATCHED but no registered devices (nothing to push).`);
    }

    // Stamp regardless of token availability so we don't re-scan this booking every minute.
    await booking.update({ end_reminder_15_sent_at: new Date() });
  }

  console.log(`Done. Bookings scanned: ${bookings.length}.`);
}

module.exports = { run };
