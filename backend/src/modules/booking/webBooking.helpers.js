// Shared helpers for the WebBookingController port (Api/Booking/WebBookingController.php).
const crypto = require('crypto');
const { dayjs } = require('../../utils/time');
const { findOrFail } = require('../../utils/binding');
const config = require('../../config');

// Route model binding: Booking $booking
const bindBooking = (req, opts = {}) => {
  const { Booking } = require('../../models');
  return findOrFail(Booking, req.params.booking, opts);
};

// Loose int compare ($booking->customer_id !== $customer->id; BIGINT may arrive as string from mysql2)
const sameId = (a, b) => a !== null && a !== undefined && b !== null && b !== undefined && Number(a) === Number(b);

const unauthorized = (res) => res.status(403).json({ success: false, message: 'Unauthorized access' });
const failJson = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });

// (float) cast
const toFloat = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};
// PHP round($x, 2)
const round2 = (n) => {
  const r = Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
  return n < 0 ? -r : r;
};
const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? 0 : n;
};

const dateStr = (d) => (d ? dayjs(d).format('YYYY-MM-DD') : null); // ->toDateString()
const dateTimeStr = (d) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm:ss') : null); // ->toDateTimeString()

// Parse a clock time like "9:00 AM", "09:00", "18:00:00" -> {hour, minute, second} | null
function parseClock(str) {
  const m = String(str || '').trim().match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const second = m[3] ? parseInt(m[3], 10) : 0;
  if (m[4]) {
    if (hour < 1 || hour > 12) return null;
    const pm = m[4].toLowerCase() === 'pm';
    hour = (hour % 12) + (pm ? 12 : 0);
  }
  if (hour > 23 || minute > 59 || second > 59) return null;
  return { hour, minute, second };
}

// Carbon::createFromFormat('g:i A', ...) -> {hour, minute} | null
function parseG_i_A(str) {
  const m = String(str || '').trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (h < 1 || h > 12 || minute > 59) return null;
  return { hour: (h % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0), minute };
}

// Carbon::parse("$date $time") -> dayjs | null
function parseDateTime(date, time) {
  const base = dayjs(String(date || '').trim());
  if (!base.isValid()) return null;
  const clock = parseClock(time);
  if (!clock) return null;
  return base.startOf('day').hour(clock.hour).minute(clock.minute).second(clock.second);
}

// Eloquent serialises relation names in snake_case; Sequelize keeps the alias. Rename the known ones.
const REL_KEYS = { subscriptionType: 'subscription_type', servicePlan: 'service_plan', visitOverrides: 'visit_overrides' };
function snakeRelations(value) {
  if (Array.isArray(value)) return value.map(snakeRelations);
  if (value && typeof value === 'object' && !(value instanceof Date) && value.constructor === Object) {
    const out = {};
    for (const k of Object.keys(value)) out[REL_KEYS[k] || k] = snakeRelations(value[k]);
    return out;
  }
  return value;
}
const toPlain = (m) => snakeRelations(m && typeof m.toJSON === 'function' ? m.toJSON() : m);

// Worker ids for a booking: collect($booking->worker_ids ?? [])->push($booking->worker_id)->filter()->map(int)->unique()
function bookingWorkerIds(booking) {
  let ids = booking.worker_ids;
  if (typeof ids === 'string') {
    try { ids = JSON.parse(ids); } catch (_) { ids = []; }
  }
  const list = Array.isArray(ids) ? ids.slice() : [];
  list.push(booking.worker_id);
  return [...new Set(list.filter(Boolean).map((id) => parseInt(id, 10)))];
}

// UserFcmToken::whereIn('user_id', $ids)->pluck('fcm_token')
async function fcmTokensFor(userIds) {
  const { UserFcmToken } = require('../../models');
  if (!userIds || !userIds.length) return [];
  const { Op } = require('sequelize');
  const rows = await UserFcmToken.findAll({ where: { user_id: { [Op.in]: userIds } }, attributes: ['fcm_token'] });
  return rows.map((r) => r.fcm_token);
}

// app(FirebaseService::class)->sendToMultiple(tokens:, title:, body:, data:)
async function sendToMultiple(tokens, title, body, data = {}) {
  const FirebaseService = require('../../services/FirebaseService');
  return FirebaseService.sendToMultiple(tokens, title, body, data);
}

// new RazorpayApi($key, $secret)
function razorpayClient() {
  const Razorpay = require('razorpay');
  try {
    return new Razorpay({ key_id: config.razorpay.key, key_secret: config.razorpay.secret });
  } catch (e) {
    // PHP's `new Api(null, null)` does not throw; the failure only happens on the first call.
    return new Proxy({}, { get: () => new Proxy({}, { get: () => async () => { throw e; } }) });
  }
}

// $razorpay->utility->verifyPaymentSignature([...]) - throws on mismatch
function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const expected = crypto
    .createHmac('sha256', config.razorpay.secret || '')
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(razorpay_signature || ''));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid signature passed');
  }
}


// ---- Carbon-like helpers: Carbon::parse keeps an explicit offset (Z / +05:30) and diffInDays() is a signed float ----
const DAY_MS = 86400000;
const ISO_TZ_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i;
function carbonParse(input) {
  const str = String(input).trim();
  const m = ISO_TZ_RE.exec(str);
  if (m && m[7]) {
    const [, y, mo, d, h = '0', mi = '0', se = '0', tz] = m;
    let off = 0;
    if (tz.toUpperCase() !== 'Z') {
      const sign = tz[0] === '-' ? -1 : 1;
      const digits = tz.slice(1).replace(':', '');
      off = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2)));
    }
    return { ms: Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se)) - off * 60000, off };
  }
  const dj = dayjs(str);
  const ms = dj.valueOf();
  return { ms, off: -new Date(ms).getTimezoneOffset() };
}
function carbonStartOfDay(c) {
  const local = c.ms + c.off * 60000;
  return { ms: Math.floor(local / DAY_MS) * DAY_MS - c.off * 60000, off: c.off };
}
const carbonYmd = (c) => new Date(c.ms + c.off * 60000).toISOString().slice(0, 10);
const carbonDateTime = (c) => new Date(c.ms + c.off * 60000).toISOString().slice(0, 19).replace('T', ' ');

module.exports = {
  carbonParse, carbonStartOfDay, carbonYmd, carbonDateTime, DAY_MS,
  bindBooking, sameId, unauthorized, failJson, toFloat, round2, toInt, dateStr, dateTimeStr,
  parseClock, parseG_i_A, parseDateTime, snakeRelations, toPlain, bookingWorkerIds, fcmTokensFor,
  sendToMultiple, razorpayClient, verifyPaymentSignature,
};
