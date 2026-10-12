// Shared helpers for the catalog / home-content / settings / time-slot controllers.
// (Not a routes file, so the module loader ignores it.)
const validate = require('../../utils/validate');
const { ValidationError } = require('../../utils/errors');
const upload = require('../../middleware/upload');
const requestHelpers = require('../../middleware/request');
const { dayjs } = require('../../utils/time');

// multipart parsing + the Laravel TrimStrings/ConvertEmptyStringsToNull pass re-applied to the parsed body
// (the global request middleware runs before multer, so it never saw the multipart fields).
const multipart = [...upload.any(), requestHelpers];

// ---- files ---------------------------------------------------------------------------------------------------
function filesOf(req, field) {
  const out = [];
  if (Array.isArray(req.files)) {
    req.files.forEach((f) => { if (f.fieldname === field || f.fieldname === `${field}[]`) out.push(f); });
  } else if (req.files && req.files[field]) {
    out.push(...[].concat(req.files[field]));
  }
  if (req.file && req.file.fieldname === field) out.push(req.file);
  return out;
}
const hasFile = (req, field) => filesOf(req, field).length > 0;
const extOf = (f) => (String(f.originalname || '').split('.').pop() || '').toLowerCase();

// Equivalent of the `<field>.*` => nullable|image|mimes:..|max:N rules for uploaded files (validate.js only expands
// wildcards over body data, not over multer files).
//   opts: { mimes: ['jpg',..], maxKb: 2048, array: true }
function fileErrors(req, field, opts = {}) {
  const { mimes, maxKb, array = false } = opts;
  const errors = {};
  const files = filesOf(req, field);
  // a file sent under the bare field name (not images[] / images[0]) is a single UploadedFile -> the `array` rule fails
  if (array && files.some((f) => f.rawFieldname === field)) {
    return { [field]: [`The ${field.replace(/_/g, ' ')} field must be an array.`] };
  }
  files.forEach((file, i) => {
    const key = `${field}.${i}`;
    const msgs = [];
    if (!/^image\//.test(file.mimetype) || file.mimetype === 'image/svg+xml') msgs.push(`The ${key} field must be an image.`);
    if (mimes && !mimes.includes(extOf(file))) msgs.push(`The ${key} field must be a file of type: ${mimes.join(', ')}.`);
    if (maxKb && file.size / 1024 > maxKb) msgs.push(`The ${key} field must not be greater than ${maxKb} kilobytes.`);
    if (msgs.length) errors[key] = msgs;
  });
  if (!files.length) {
    const body = req.has(field) ? req.input(field) : null;
    if (Array.isArray(body)) {
      body.forEach((v, i) => {
        if (v === null || v === undefined) return;
        const key = `${field}.${i}`;
        const msgs = [`The ${key} field must be an image.`];
        if (mimes) msgs.push(`The ${key} field must be a file of type: ${mimes.join(', ')}.`);
        errors[key] = msgs;
      });
    } else if (array && body !== null && body !== undefined) {
      errors[field] = [`The ${field.replace(/_/g, ' ')} field must be an array.`];
    }
  }
  return errors;
}

// ---- validation ----------------------------------------------------------------------------------------------
// validate() + extra checks for rules validate.js does not implement (after_or_equal, required_unless, file arrays...).
//   extra: async (data, req) => ({ field: [messages] })
// Also keeps explicitly-sent null values in the result (Laravel's validated() contains them; validate.js drops them).
async function validateEx(req, rules, messages = {}, extra = null) {
  let errors = {};
  let validated = {};
  try {
    validated = await validate(req, rules, messages);
  } catch (e) {
    if (e instanceof ValidationError) errors = { ...e.errors };
    else throw e;
  }
  if (extra) {
    const more = (await extra(req.all(), req)) || {};
    for (const [k, v] of Object.entries(more)) errors[k] = (errors[k] || []).concat(v);
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  for (const k of Object.keys(rules)) {
    if (k.includes('*') || k in validated) continue;
    if (req.has(k) && req.input(k) === null) validated[k] = null;
  }
  return validated;
}

const labelOf = (f) => f.replace(/_/g, ' ');

// after_or_equal:<otherField>  (other field absent/empty -> passes, like comparing against null)
function afterOrEqual(data, field, other, errors) {
  const v = data[field];
  const o = data[other];
  if (v === null || v === undefined || o === null || o === undefined) return;
  const a = dayjs(v);
  const b = dayjs(o);
  // PHP: unparsable value vs parsable other -> null >= ts fails; unparsable other (or both) passes
  if ((!a.isValid() && b.isValid()) || (a.isValid() && b.isValid() && a.valueOf() < b.valueOf())) {
    (errors[field] ||= []).push(`The ${labelOf(field)} field must be a date after or equal to ${labelOf(other)}.`);
  }
}

// Eloquent datetime cast on write: 'Y-m-d' -> start of day, strings are parsed in the app timezone (process TZ is
// Asia/Kolkata); an explicit offset/Z keeps the wall-clock digits as written (Carbon::parse then format()).
function castDateTime(v) {
  if (v === null || v === undefined || v instanceof Date) return v;
  const s = String(v).trim();
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?)?\s*(?:Z|[+-]\d{2}:?\d{2})?$/i.exec(s);
  if (!m) return dayjs(s).toDate();
  return dayjs(`${m[1]} ${m[2] || '00:00:00'}`).toDate();
}

// Eloquent Model::create(): the returned model holds ONLY the attributes that were passed in (+ id/timestamps);
// DB defaults are not read back and un-cast values keep their raw input type. casts: { attr: fn }.
const castBool = (v) => (v === null || v === undefined ? null : !(v === false || v === 0 || v === '0' || v === '' || (Array.isArray(v) && !v.length)));
const castInt = (v) => (v === null || v === undefined ? null : (parseInt(v, 10) || 0));
function createdAttrs(row, data, casts = {}) {
  const j = toJSON(row);
  const out = { id: j.id, created_at: j.created_at, updated_at: j.updated_at };
  Object.keys(data).forEach((k) => { out[k] = casts[k] ? casts[k](data[k]) : data[k]; });
  return out;
}
// Model::update($data) then returning the same model: DB-loaded attributes overlaid with the raw input.
function updatedAttrs(row, data, casts = {}) {
  const out = { ...toJSON(row) };
  Object.keys(data).forEach((k) => { out[k] = casts[k] ? casts[k](data[k]) : data[k]; });
  return out;
}

// ---- misc ----------------------------------------------------------------------------------------------------
const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
};
const dropNulls = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));

// Eloquent array cast
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; }
  }
  return [];
}

// Eloquent in-memory model after create()/update(): attributes are the RAW assigned values (casts only apply on read,
// and the row is not re-read from the DB). base = Eloquent JSON of the row loaded before an update ({} for create).
const phpMeta = require('../../models/phpMeta.json');
const { transform: castTransform } = require('../../models/serializer');
function inMemory(modelName, base, assigned, instance) {
  const casts = (phpMeta[modelName] || {}).casts || {};
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(assigned || {})) out[k] = casts[k] ? castTransform(v, casts[k], null) : v;
  if (instance) {
    const j = typeof instance.toJSON === 'function' ? instance.toJSON() : instance;
    for (const k of ['id', 'created_at', 'updated_at']) if (j[k] !== undefined) out[k] = j[k];
  }
  return out;
}

const toJSON = (row) => (row && typeof row.toJSON === 'function' ? row.toJSON() : row);
const clone = (v) => JSON.parse(JSON.stringify(v));

// PHP (float) / (int) casts
const toFloat = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
const toInt = (v) => { const n = parseInt(v, 10); return Number.isNaN(n) ? 0 : n; };

// filter_var($v, FILTER_VALIDATE_BOOLEAN)
const filterBool = (v) => ['1', 'true', 'on', 'yes'].includes(String(v).toLowerCase());

// Eloquent exposes belongsToMany join columns as `pivot`; Sequelize uses the through-model name.
const camel = (s) => s.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
const pascal = (s) => { const c = camel(s); return c.charAt(0).toUpperCase() + c.slice(1); };
function pivotize(json, relation, table) {
  const items = json && Array.isArray(json[relation]) ? json[relation] : [];
  const names = [table, camel(table), pascal(table)];
  items.forEach((item) => {
    for (const n of names) {
      if (item && item[n] !== undefined) { item.pivot = item[n]; delete item[n]; break; }
    }
  });
  return json;
}

// PHP integer-id compare helper
const same = (a, b) => Number(a) === Number(b);

module.exports = {
  inMemory,
  castBool, castInt, createdAttrs, updatedAttrs, castDateTime, multipart, filesOf, hasFile, fileErrors, validateEx, afterOrEqual, labelOf,
  pick, dropNulls, asArray, toJSON, clone, toFloat, toInt, filterBool, pivotize, same,
};
