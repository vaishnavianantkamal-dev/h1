// Small helpers reproducing PHP semantics needed by the Razorpay webhook controllers.
const isArr = (v) => Array.isArray(v) || (v !== null && typeof v === 'object');

// PHP truthiness: '', '0', 0, 0.0, null, false, [] are falsy
const truthy = (v) => {
  if (v === undefined || v === null || v === false || v === 0 || v === '' || v === '0') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v !== null && typeof v === 'object') return Object.keys(v).length > 0;
  return true;
};

// `$x / 100` as PHP does it: numeric strings and bools work, other strings/arrays throw (TypeError / warning->ErrorException in Laravel)
const div100 = (v) => {
  if (v === undefined || v === null) return 0 / 100;
  if (typeof v === 'number') return v / 100;
  if (typeof v === 'boolean') return (v ? 1 : 0) / 100;
  if (typeof v === 'string') {
    if (/^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[ \t\n\r\v\f]*$/.test(v)) return Number(v.trim()) / 100;
    throw new Error('Unsupported operand types: string / int');
  }
  throw new Error('Unsupported operand types: array / int');
};

// PHP parameter type checks (non-strict mode): ?array, ?string, string
const assertNullableArray = (v) => { if (v !== null && v !== undefined && !isArr(v)) throw new TypeError('Argument must be of type ?array'); return v; };
const assertNullableString = (v) => { if (v !== null && v !== undefined && isArr(v)) throw new TypeError('Argument must be of type ?string'); return v; };
const assertString = (v) => { if (v === null || v === undefined || isArr(v)) throw new TypeError('Argument must be of type string'); return v; };

module.exports = { truthy, div100, assertNullableArray, assertNullableString, assertString, isArr };

// Carbon::parse($str): PHP's date parser accepts a lot; we accept ISO-ish dates, a few keywords, "@ts" and anything with a
// 4-digit year that JS can parse. Everything else throws InvalidFormatException (-> 500 Server Error in Laravel).
const ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i;
function carbonParseCheck(v) {
  if (typeof v !== 'string') throw new TypeError('Carbon::parse(): Argument #1 ($time) must be of type ?string');
  const t = v.trim();
  const lw = t.toLowerCase();
  if (['', 'now', 'today', 'midnight', 'tomorrow', 'yesterday', 'noon'].includes(lw)) return true;
  if (/^@-?\d+$/.test(t)) return true;
  const m = ISO_RE.exec(t);
  if (m) {
    const [, y, mo, d, h = '0', mi = '0', se = '0'] = m;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) throw new Error(`Failed to parse time string (${v})`);
    if (Number(h) > 24 || Number(mi) > 59 || Number(se) > 59) throw new Error(`Failed to parse time string (${v})`);
    return true;
  }
  if (/\d{4}/.test(t) && !Number.isNaN(Date.parse(t))) return true;
  throw new Error(`Failed to parse time string (${v}) at position 0`);
}
module.exports.carbonParseCheck = carbonParseCheck;

// Carbon::parse(): returns a dayjs (process TZ = Asia/Kolkata). Covers the common strtotime() shapes; throws on anything else.
function carbonParse(v) {
  const { dayjs } = require('../../utils/time');
  if (typeof v !== 'string') throw new TypeError('Carbon::parse(): Argument #1 ($time) must be of type ?string');
  const t = v.trim();
  const lw = t.toLowerCase();
  const sod = () => dayjs().startOf('day');
  const bad = () => { throw new Error(`Failed to parse time string (${v}) at position 0`); };
  const mk = (y, mo, d, h = 0, mi = 0, se = 0) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 24 || mi > 59 || se > 59) bad();
    return dayjs(new Date(y, mo - 1, d, h, mi, se));
  };
  if (lw === '' || lw === 'now') return dayjs();
  // military time-zone letter ("x"): PHP reads it as "now" in that zone (A-I=+1..+9, K-M=+10..+12, N-Y=-1..-12, Z=0)
  if (/^[a-ik-z]$/.test(lw)) {
    const c = lw.charCodeAt(0) - 96;
    const off = lw === 'z' ? 0 : c <= 9 ? c : c <= 13 ? c - 1 : -(c - 13);
    const w = new Date(Date.now() + off * 3600000);
    return dayjs(new Date(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), w.getUTCHours(), w.getUTCMinutes(), w.getUTCSeconds()));
  }
  if (t === '0000-00-00') return dayjs('1000-01-01'); // PHP: -0001-11-30 (before any data)
  const units = { sec: 'second', second: 'second', min: 'minute', minute: 'minute', hour: 'hour', day: 'day', week: 'week', fortnight: 'fortnight', month: 'month', year: 'year' };
  let rm = /^([+-]?\s*\d+)\s*(sec|second|min|minute|hour|day|week|fortnight|month|year)s?(\s+ago)?$/.exec(lw);
  if (rm) {
    let n = parseInt(rm[1].replace(/\s+/g, ''), 10);
    if (rm[3]) n = -n;
    const u = units[rm[2]];
    return u === 'fortnight' ? dayjs().add(n * 2, 'week') : dayjs().add(n, u);
  }
  const wd = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  rm = /^(next|last|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.exec(lw);
  if (rm) {
    const target = wd.indexOf(rm[2]);
    const base = sod();
    const cur = base.day();
    let diff = (target - cur + 7) % 7;
    if (rm[1] === 'next') diff = diff === 0 ? 7 : diff;
    else if (rm[1] === 'last') diff = diff === 0 ? -7 : diff - 7;
    return base.add(diff, 'day');
  }
  if (lw === 'today' || lw === 'midnight') return sod();
  if (lw === 'tomorrow') return sod().add(1, 'day');
  if (lw === 'yesterday') return sod().subtract(1, 'day');
  if (lw === 'noon') return sod().add(12, 'hour');
  let m;
  if ((m = /^@(-?\d+)$/.exec(t))) return dayjs(Number(m[1]) * 1000);
  if ((m = ISO_RE.exec(t))) {
    if (m[7]) return dayjs(new Date(Date.parse(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T${(m[4] || '0').padStart(2, '0')}:${m[5] || '00'}:${(m[6] || '0').padStart(2, '0')}${m[7].toUpperCase() === 'Z' ? 'Z' : m[7].length === 5 ? `${m[7].slice(0, 3)}:${m[7].slice(3)}` : m[7]}`)));
    return mk(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  if ((m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(t))) return mk(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) return mk(+m[3], +m[1], +m[2]); // American m/d/Y
  if ((m = /^(\d{1,2})[-.](\d{1,2})[-.](\d{4})$/.exec(t))) return mk(+m[3], +m[2], +m[1]); // d-m-Y
  if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(t))) return mk(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{4})-(\d{2})$/.exec(t))) return mk(+m[1], +m[2], 1);
  if (/^\d{4}$/.test(t)) { const h = +t.slice(0, 2); const mi = +t.slice(2); if (h > 24 || mi > 59) bad(); return sod().add(h, 'hour').add(mi, 'minute'); }
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) bad();
  return dayjs(ms);
}
module.exports.carbonParse = carbonParse;
