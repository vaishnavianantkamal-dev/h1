// Helpers for BookingController (port of its private methods + small query/format utilities).
const axios = require('axios');
const config = require('../../config');
const { sequelize, Op } = require('../../models');
const { dayjs } = require('../../utils/time');

const q = (v) => sequelize.escape(v); // safe SQL literal for a value
const lit = (sql) => sequelize.literal(sql);

// ---------------------------------------------------------------- php-ish utils
// PHP is_numeric()
const isNumeric = (v) =>
  (typeof v === 'number' && Number.isFinite(v)) ||
  (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)));

// PHP array_filter() over a key=>value object. Returns [] when empty (PHP encodes an empty array as []).
function arrayFilter(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '' || v === '0' || v === 0 || v === false) continue;
    if (Array.isArray(v) && !v.length) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : [];
}

// Laravel Request::only(...) -> only keys that are present
const only = (req, keys) => req.only(...keys);

// ---------------------------------------------------------------- carbon-ish parsing
// Carbon::parse($str): throws on garbage.
function carbonParse(value, fmts) {
  if (value instanceof Date) return dayjs(value);
  if (dayjs.isDayjs(value)) return value;
  const s = String(value).trim();
  for (const f of fmts || []) {
    const d = dayjs(s, f);
    if (d.isValid()) return d;
  }
  // strtotime() quirks: dd-mm-yyyy is day-first, dd/mm/yyyy is month-first
  let mm;
  if ((mm = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/))) {
    const d2 = dayjs(`${mm[3]}-${mm[2].padStart(2, '0')}-${mm[1].padStart(2, '0')}`, 'YYYY-MM-DD', true);
    if (d2.isValid()) return d2;
  }
  if ((mm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    const d2 = dayjs(`${mm[3]}-${mm[1].padStart(2, '0')}-${mm[2].padStart(2, '0')}`, 'YYYY-MM-DD', true);
    if (d2.isValid()) return d2;
  }
  let d = dayjs(s);
  if (!d.isValid()) {
    const nd = new Date(s);
    d = dayjs(nd);
  }
  if (!d.isValid()) throw new Error(`Could not parse '${s}'`);
  return d;
}

// Carbon::parse("<Y-m-d> <time>") where time may be "09:00 AM", "9:00 AM", "17:00", "9 AM".
const TIME_FORMATS = ['hh:mm A', 'h:mm A', 'hh:mm:ss A', 'h:mm:ss A', 'HH:mm', 'H:mm', 'HH:mm:ss', 'h A', 'hh A'];
function parseDateTime(dateStr, timeStr) {
  const t = String(timeStr).trim();
  for (const f of TIME_FORMATS) {
    const d = dayjs(`${dateStr} ${t}`, `YYYY-MM-DD ${f}`, true);
    if (d.isValid()) return d;
  }
  const d = dayjs(`${dateStr} ${t}`);
  if (d.isValid()) return d;
  throw new Error(`Could not parse '${dateStr} ${t}'`);
}

// private function parseDateFlexible(string $date): Carbon
function parseDateFlexible(date) {
  if (date instanceof Date || dayjs.isDayjs(date)) return dayjs(date);
  const s = String(date);
  // Accepts dd/mm/yyyy and dd-mm-yyyy
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(s)) {
    const sep = s.includes('/') ? '/' : '-';
    return dayjs(s, `DD${sep}MM${sep}YYYY`).startOf('day');
  }
  return carbonParse(s);
}

// private function normalizeTime(string $time): Carbon   (today's date + the given time)
function normalizeTime(time) {
  const t = String(time).trim().toLowerCase();
  const base = dayjs().startOf('day');
  let m;
  // PHP createFromFormat: H / i overflow into the next day/hour (no error); g accepts 0..12
  if ((m = t.match(/^(\d{1,2})$/))) {
    return base.add(parseInt(m[1], 10), 'hour');
  }
  if ((m = t.match(/^(\d{1,2})\s?(am|pm)$/))) {
    let h = parseInt(m[1], 10);
    if (h > 12) throw new Error('Invalid time');
    h = (h % 12) + (m[2] === 'pm' ? 12 : 0);
    return base.add(h, 'hour');
  }
  if ((m = t.match(/^(\d{1,2}):(\d{2})$/))) {
    return base.add(parseInt(m[1], 10), 'hour').add(parseInt(m[2], 10), 'minute');
  }
  if ((m = t.match(/^(\d{1,2}):(\d{2})\s?(am|pm)$/))) {
    let h = parseInt(m[1], 10);
    if (h > 12) throw new Error('Invalid time');
    h = (h % 12) + (m[3] === 'pm' ? 12 : 0);
    return base.add(h, 'hour').add(parseInt(m[2], 10), 'minute');
  }
  throw new Error('Invalid time');
}

// Slot string -> "H:i:s" start time, or null when it can't be parsed (bad filter values are ignored).
function parseSlotTime(slot) {
  let s = String(slot ?? '').trim();
  if (s === '') return null;
  if (s.includes('-')) s = s.split('-')[0].trim();
  try {
    return normalizeTime(s).format('HH:mm:ss');
  } catch (e) {
    return null;
  }
}

function parseBookingDate(bookingDate) {
  const raw = String(bookingDate).trim().toLowerCase();
  if (raw === 'today') return dayjs().startOf('day');
  if (raw === 'tomorrow') return dayjs().add(1, 'day').startOf('day');
  return carbonParse(bookingDate);
}

function parseSlotStart(bookingDate, timeSlot) {
  const m = String(timeSlot).match(/^\s*(.*?)\s*-\s*(.*?)\s*$/);
  if (!m) throw new Error('Invalid time slot format');
  return parseDateTime(bookingDate.format('YYYY-MM-DD'), m[1].trim());
}

// PRICE CALCULATOR (central logic)
function calculatePrice(service) {
  const isFestival = false;
  if (isFestival && service.festival_price) return Number(service.festival_price);
  return Number(service.price);
}

// private function sendWhatsApp(string $phone, string $message): void  (never throws)
async function sendWhatsApp(phone, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${config.whatsapp.phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } },
      { headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` }, validateStatus: () => true }
    );
  } catch (e) {
    console.error('WhatsApp failed', { phone, error: e.message });
  }
}

// ---------------------------------------------------------------- SQL fragments (EXISTS == whereHas)
// Main query alias is the model name: `Booking`.
const EXISTS_SERVICES = (cond) =>
  lit(`EXISTS (SELECT 1 FROM booking_services bs WHERE bs.booking_id = Booking.id AND ${cond})`);
const EXISTS_SERVICES_SERVICE = (cond) =>
  lit(`EXISTS (SELECT 1 FROM booking_services bs INNER JOIN services s ON s.id = bs.service_id WHERE bs.booking_id = Booking.id AND ${cond})`);
const EXISTS_SERVICES_SUBTYPE = (cond) =>
  lit(`EXISTS (SELECT 1 FROM booking_services bs INNER JOIN subscription_type st ON st.id = bs.subscription_type_id WHERE bs.booking_id = Booking.id AND ${cond})`);
const EXISTS_SERVICE = (cond) =>
  lit(`EXISTS (SELECT 1 FROM services s0 WHERE s0.id = Booking.service_id AND ${cond})`);
const EXISTS_CUSTOMER = (cond) =>
  lit(`EXISTS (SELECT 1 FROM users u WHERE u.id = Booking.customer_id AND u.deleted_at IS NULL AND ${cond})`);
const EXISTS_OVERRIDES = (cond) =>
  lit(`EXISTS (SELECT 1 FROM booking_visit_overrides vo WHERE vo.booking_id = Booking.id AND ${cond})`);
const EXISTS_EXTENSIONS = (cond) =>
  lit(`EXISTS (SELECT 1 FROM booking_extensions be WHERE be.booking_id = Booking.id AND ${cond})`);

// ->whereDate(col, op, value)
const whereDate = (col, op, value) => sequelize.where(sequelize.fn('DATE', sequelize.col(col)), op, value);

const SLOT_EXPR =
  'COALESCE(' +
  "TIME(STR_TO_DATE(Booking.time_slot, '%h:%i %p')), " +
  "TIME(STR_TO_DATE(Booking.time_slot, '%H:%i'))" +
  ')';

// time_slot / slot_from / slot_to filters shared by index() and export().
// Pushes conditions into `and`; returns true when a slot filter was applied.
function applySlotFilters(req, and) {
  let slotFiltered = false;

  if (req.filled('time_slot')) {
    const slots = [...new Set(String(req.input('time_slot')).split(',').map((s) => parseSlotTime(s)).filter(Boolean))];
    if (slots.length) {
      and.push(lit(`${SLOT_EXPR} IN (${slots.map((s) => q(s)).join(',')})`));
      slotFiltered = true;
    }
  }
  let slotFrom;
  if (req.filled('slot_from') && (slotFrom = parseSlotTime(req.input('slot_from')))) {
    and.push(lit(`${SLOT_EXPR} >= ${q(slotFrom)}`));
    slotFiltered = true;
  }
  let slotTo;
  if (req.filled('slot_to') && (slotTo = parseSlotTime(req.input('slot_to')))) {
    and.push(lit(`${SLOT_EXPR} <= ${q(slotTo)}`));
    slotFiltered = true;
  }
  return slotFiltered;
}

const slotOrder = () => [lit(`${SLOT_EXPR} asc`), ['created_at', 'DESC']];

// search by booking id / customer name+email / service name
function searchCondition(search) {
  const like = q(`%${search}%`);
  return {
    [Op.or]: [
      lit(`Booking.id = ${q(search)}`),
      lit(`Booking.id LIKE ${like}`),
      EXISTS_CUSTOMER(`(u.name LIKE ${like} OR u.email LIKE ${like})`),
      EXISTS_SERVICES_SERVICE(`s.name LIKE ${like}`),
    ],
  };
}

// "today" filter: booking today / service starts today / service ongoing today, and not cancelled
function todayConditions(today) {
  return [
    {
      [Op.or]: [
        whereDate('Booking.booking_date', '=', today),
        EXISTS_SERVICES(`DATE(bs.start_date) = ${q(today)}`),
        EXISTS_SERVICES(`DATE(bs.start_date) <= ${q(today)} AND DATE(bs.end_date) >= ${q(today)}`),
      ],
    },
    { status: { [Op.ne]: 'cancelled' } },
  ];
}

// ---------------------------------------------------------------- formatting
const minMax = (values, pick) => {
  const vs = values
    .filter((v) => v !== null && v !== undefined)
    .map((v) => ({ raw: v, key: v instanceof Date ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : String(v) }));
  if (!vs.length) return null;
  return vs.reduce((a, b) => (pick === 'min' ? (b.key < a.key ? b : a) : b.key > a.key ? b : a)).raw;
};
// Eloquent serialises relation names in snake_case; Sequelize keeps the alias
const REL_KEYS = { subscriptionType: 'subscription_type', servicePlan: 'service_plan', visitOverrides: 'visit_overrides' };
const snakeRelations = (v) => {
  if (Array.isArray(v)) return v.map(snakeRelations);
  if (v && typeof v === 'object' && !(v instanceof Date) && v.constructor === Object) {
    const out = {};
    for (const k of Object.keys(v)) out[REL_KEYS[k] || k] = snakeRelations(v[k]);
    return out;
  }
  return v;
};
const asJson = (x) => (x && typeof x.toJSON === 'function' ? snakeRelations(x.toJSON()) : x);

// private function formatBookingDates(Booking $booking): array
function formatBookingDates(booking) {
  const services = booking.services || [];
  const startDate = minMax(services.map((s) => s.start_date), 'min') ?? booking.booking_date;
  const endDate = minMax(services.map((s) => s.end_date), 'max') ?? booking.booking_date;

  const data = asJson(booking);

  data.booking_date = booking.booking_date ? parseDateFlexible(booking.booking_date).format('DD-MM-YYYY') : null;
  data.start_date = startDate ? parseDateFlexible(startDate).format('DD-MM-YYYY') : null;
  data.end_date = endDate ? parseDateFlexible(endDate).format('DD-MM-YYYY') : null;
  data.service_ended_at = booking.service_ended_at
    ? parseDateFlexible(booking.service_ended_at).format('DD-MM-YYYY HH:mm:ss')
    : null;

  data.services = services.map((line) => {
    const item = asJson(line);

    // Enrich services with addon details when is_addon = true
    if (line.is_addon && line.addon) {
      item.addon_name = line.addon.name;
      item.addon_price = line.addon.price;
      item.addon_qty = line.quantity;
    }

    item.start_date = item.start_date ? parseDateFlexible(item.start_date).format('DD-MM-YYYY') : null;
    item.end_date = item.end_date ? parseDateFlexible(item.end_date).format('DD-MM-YYYY') : null;
    return item;
  });

  return data;
}

// coordinator_ids cast 'array' (may arrive as JSON string)
function coordinatorIdsOf(b) {
  let ids = b.coordinator_ids ?? [];
  if (typeof ids === 'string') {
    try { ids = JSON.parse(ids) ?? []; } catch (e) { ids = []; }
  }
  return Array.isArray(ids) ? ids : Object.values(ids || {});
}

module.exports = {
  q, lit, isNumeric, arrayFilter, only, carbonParse, parseDateTime, parseDateFlexible, normalizeTime,
  parseSlotTime, parseBookingDate, parseSlotStart, calculatePrice, sendWhatsApp,
  EXISTS_SERVICES, EXISTS_SERVICES_SERVICE, EXISTS_SERVICES_SUBTYPE, EXISTS_SERVICE, EXISTS_CUSTOMER,
  EXISTS_OVERRIDES, EXISTS_EXTENSIONS, whereDate, SLOT_EXPR, applySlotFilters, slotOrder, searchCondition,
  todayConditions, formatBookingDates, coordinatorIdsOf, minMax,
};
