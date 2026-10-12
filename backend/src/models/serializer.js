// Makes Sequelize models serialise to JSON exactly like Eloquent's toArray()/toJson().
//
// Rules reproduced from Laravel (driven by phpMeta.json, which is extracted from the PHP models' $casts/$hidden/$dates):
//  * every DB column is output (even ones the model file does not declare) - see initSchema()
//  * cast columns follow the cast:  integer, float, decimal:N (string), boolean, array/json (parsed),
//    date/datetime/timestamp (ISO-8601 UTC with microseconds, e.g. 2026-10-01T04:30:00.000000Z), string
//  * UN-cast columns are returned as the raw DB value PDO would give: datetime -> 'YYYY-MM-DD HH:mm:ss',
//    date -> 'YYYY-MM-DD', decimal -> string with the column scale, ints -> number, text/json -> string
//  * created_at/updated_at (when the model uses timestamps) and deleted_at (SoftDeletes) are ISO date casts
//  * $hidden attributes are removed
//  * eager-loaded relations are serialised with the related model's rules
const { DataTypes } = require('sequelize');
const meta = require('./phpMeta.json');

const colInfo = {}; // modelName -> { column: { type: 'datetime', scale: 2 } }

const pad = (n, l = 2) => String(n).padStart(l, '0');
const fmtLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d):(\d\d))?$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)); // local (Asia/Kolkata)
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  return null;
}
// Carbon::toJSON() -> UTC ISO with microseconds
const iso = (v) => {
  const d = toDate(v);
  return d ? d.toISOString().replace(/\.(\d{3})Z$/, '.$1000Z') : v;
};

function parseJson(v) {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (_) { return v; }
}

// number_format()/round() style half-away-from-zero rounding on the decimal representation (JS toFixed(2) of 20.555 gives 20.55)
function phpDecimal(v, scale) {
  const n = Number(v);
  if (!Number.isFinite(n)) return n.toFixed(scale);
  const r = Math.round(Math.abs(n) + 'e' + scale);
  const out = Number((n < 0 ? -r : r) + 'e-' + scale);
  return out.toFixed(scale);
}

function transform(v, cast, info) {
  if (v === null || v === undefined) return v === undefined ? undefined : null;
  const [base, arg] = cast ? cast.split(':') : [null, null];
  switch (base) {
    case 'integer': case 'int': return Number(v);
    case 'float': case 'double': case 'real': return Number(v);
    case 'decimal': return phpDecimal(v, Number(arg));
    case 'boolean': case 'bool': return v === true || v === 1 || v === '1' || v === 'true';
    case 'array': case 'json': case 'object': case 'collection': return parseJson(v);
    case 'string': return String(v);
    case 'date': {
      const d = toDate(v);
      if (!d) return v;
      if (arg) return fmtDate(d); // custom format cases are rare; handled by caller if needed
      return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    case 'datetime': case 'timestamp': case 'immutable_datetime': case 'immutable_date': return iso(v);
    default: break;
  }
  // no cast -> raw PDO value
  const t = (info && info.type) || '';
  if (t === 'datetime' || t === 'timestamp') { const d = toDate(v); return d ? fmtLocal(d) : v; }
  if (t === 'date') { const d = toDate(v); return d ? fmtDate(d) : v; }
  if (t === 'decimal' || t === 'numeric') return info.scale !== undefined && !isNaN(Number(v)) ? Number(v).toFixed(info.scale) : String(v);
  if (['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint', 'year'].includes(t)) return typeof v === 'boolean' ? (v ? 1 : 0) : isNaN(Number(v)) ? v : Number(v);
  if (['float', 'double', 'real'].includes(t)) return Number(v);
  if (typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v); // json/text column stored as string in PHP
  if (v instanceof Date) { return fmtLocal(v); }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

function post(Model, o) {
  if (!o || typeof o !== 'object') return o;
  const pm = meta[Model.name] || {};
  const casts = { ...(pm.casts || {}) };
  if (pm.timestamps !== false) { casts.created_at = casts.created_at || 'datetime'; casts.updated_at = casts.updated_at || 'datetime'; }
  if (pm.softDeletes) casts.deleted_at = casts.deleted_at || 'datetime';
  (pm.dates || []).forEach((k) => { casts[k] = casts[k] || 'datetime'; });
  const info = colInfo[Model.name] || {};
  const hidden = new Set(pm.hidden || []);
  const out = {};
  for (const k of Object.keys(o)) {
    if (hidden.has(k)) continue;
    const assoc = Model.associations && Model.associations[k];
    if (assoc) {
      const v = o[k];
      out[k] = Array.isArray(v) ? v.map((x) => post(assoc.target, x)) : v && typeof v === 'object' ? post(assoc.target, v) : v;
      continue;
    }
    if (casts[k] || info[k]) out[k] = transform(o[k], casts[k], info[k]);
    else out[k] = o[k];
  }
  // Eloquent emits attributes in DB column order (then accessors, then relations). When the whole row was loaded, restore that order.
  const cols = Object.keys(info).filter((c) => !hidden.has(c));
  if (cols.length && cols.every((c) => c in out)) {
    const ordered = {};
    for (const c of cols) ordered[c] = out[c];
    const isRel = (k) => !!(Model.associations && Model.associations[k]);
    for (const k of Object.keys(out)) if (!(k in ordered) && !isRel(k)) ordered[k] = out[k];
    for (const k of Object.keys(out)) if (!(k in ordered)) ordered[k] = out[k];
    return ordered;
  }
  return out;
}

function install(models) {
  for (const M of Object.values(models)) {
    if (M.name === 'NodeJob' || M.name === 'PersonalAccessToken') continue;
    const orig = M.prototype.toJSON;
    M.prototype.toJSON = function toJSON() { return post(M, orig.call(this)); };
  }
}

const typeMap = (t) => {
  t = t.toLowerCase();
  if (/^(tinyint|smallint|mediumint|int)/.test(t)) return DataTypes.INTEGER;
  if (/^bigint/.test(t)) return DataTypes.BIGINT;
  if (/^(decimal|numeric)/.test(t)) return DataTypes.DECIMAL;
  if (/^(float|double|real)/.test(t)) return DataTypes.DOUBLE;
  if (/^(datetime|timestamp)/.test(t)) return DataTypes.DATE;
  if (/^date$/.test(t)) return DataTypes.DATEONLY;
  if (/^(time)/.test(t)) return DataTypes.TIME;
  return DataTypes.TEXT;
};

// Reads the REAL table definitions: records column types (for raw-value rules) and adds any column the model file
// does not declare, so API output contains every column like Eloquent does.
async function initSchema(models, sequelize) {
  const qi = sequelize.getQueryInterface();
  for (const M of Object.values(models)) {
    if (M.name === 'NodeJob' || M.name === 'PersonalAccessToken') continue;
    const t = M.getTableName();
    const tn = typeof t === 'string' ? t : t.tableName;
    let desc;
    try { desc = await qi.describeTable(tn); } catch (_) { continue; } // table missing in DB: leave model as is
    const info = {};
    let added = false;
    for (const [col, d] of Object.entries(desc)) {
      const m = String(d.type).toLowerCase().match(/^(\w+)(?:\((\d+)(?:,\s*(\d+))?\))?/);
      const base = m ? m[1] : String(d.type).toLowerCase();
      info[col] = { type: base, scale: m && m[3] !== undefined ? Number(m[3]) : base === 'decimal' ? 0 : undefined };
      const declared = Object.values(M.rawAttributes).some((a) => (a.field || a.fieldName) === col) || M.rawAttributes[col];
      if (!declared) {
        M.rawAttributes[col] = { type: typeMap(base), field: col, fieldName: col, allowNull: true };
        added = true;
      }
    }
    if (added) M.refreshAttributes();
    colInfo[M.name] = info;
  }
}

// Eloquent attribute value for ONE column, e.g. attr('Booking', 'amount', booking.amount) -> "600.00".
// Use when a controller builds its own response object from model fields (Eloquent applies casts on attribute access;
// Sequelize does not). Equivalent to reading the same key from instance.toJSON().
function attr(modelName, column, value) {
  const pm = meta[modelName] || {};
  const casts = { ...(pm.casts || {}) };
  if (pm.timestamps !== false) { casts.created_at = casts.created_at || 'datetime'; casts.updated_at = casts.updated_at || 'datetime'; }
  if (pm.softDeletes) casts.deleted_at = casts.deleted_at || 'datetime';
  (pm.dates || []).forEach((k) => { casts[k] = casts[k] || 'datetime'; });
  return transform(value, casts[column], (colInfo[modelName] || {})[column]);
}

module.exports = { install, initSchema, post, transform, iso, colInfo, attr };
