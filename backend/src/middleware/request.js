// Laravel Request niceties + TrimStrings + ConvertEmptyStringsToNull.
//   req.all()  req.input('k', default)  req.filled('k')  req.has('k')  req.only('a','b')  req.except('a')  req.boolean('k')
// TrimStrings (Illuminate\Support\Str::trim: whitespace + invisible characters; `password`-like keys are never trimmed - top-level only,
// nested keys carry a dotted prefix) followed by ConvertEmptyStringsToNull.
const TRIM_CHARS = '\\s\\u0000\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180E\\u2000-\\u200F\\u202F\\u205F\\u2060-\\u2064\\u206A-\\u206F\\u3000\\u2800\\u3164\\uFEFF\\uFFA0\\u{1D159}\\u{1D173}-\\u{1D17A}';
const TRIM_RE = new RegExp(`^[${TRIM_CHARS}]+|[${TRIM_CHARS}]+$`, 'gu');
const NEVER_TRIM = new Set(['current_password', 'password', 'password_confirmation']);
const clean = (v, key = '') => {
  if (typeof v === 'string') { const t = NEVER_TRIM.has(key) ? v : v.replace(TRIM_RE, ''); return t === '' ? null : t; }
  if (Array.isArray(v)) return v.map((x, i) => clean(x, key ? `${key}.${i}` : String(i)));
  if (v && typeof v === 'object' && (v.constructor === Object || Object.getPrototypeOf(v) === null)) {
    const o = {};
    for (const k of Object.keys(v)) o[k] = clean(v[k], key ? `${key}.${k}` : k);
    return o;
  }
  return v;
};
const cleanTop = (obj) => clean(obj, '');

const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const cleanBody = (req, res, next) => { if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) req.body = cleanTop(req.body); next(); };

module.exports = (req, res, next) => {
  // PHP never parses a multipart/form-data body for PUT/PATCH/DELETE: Laravel sees an empty body (and no files)
  if (['PUT', 'PATCH', 'DELETE'].includes(req.__realMethod || req.method) && /^multipart\/form-data/i.test(req.headers['content-type'] || '')) req.headers['content-type'] = 'application/x-laravel-ignored-multipart';
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) req.body = cleanTop(req.body);
  // express exposes query via a getter; override with a cleaned copy
  Object.defineProperty(req, 'query', { value: cleanTop({ ...req.query }), writable: true, configurable: true });

  req.all = () => ({ ...req.query, ...(req.body || {}) });
  req.input = (key, def = null) => {
    if (key === undefined) return req.all();
    const v = getPath(req.all(), key);
    return v === undefined ? def : v;
  };
  req.has = (key) => getPath(req.all(), key) !== undefined;
  req.filled = (key) => {
    const v = getPath(req.all(), key);
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length && false);
  };
  req.boolean = (key, def = false) => {
    const v = getPath(req.all(), key);
    if (v === undefined || v === null) return def;
    return [true, 1, '1', 'true', 'on', 'yes'].includes(v);
  };
  req.only = (...keys) => {
    const a = req.all(); const o = {};
    keys.flat().forEach((k) => { if (a[k] !== undefined) o[k] = a[k]; });
    return o;
  };
  req.except = (...keys) => {
    const a = req.all(); keys.flat().forEach((k) => delete a[k]);
    return a;
  };
  req.bearerToken = () => (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
  next();
};
module.exports.cleanBody = cleanBody;
