// Laravel-style validator.
//   const data = await validate(req, { phone: 'required|string|max:15', 'items.*.id': 'required|integer' }, customMessages?)
// Throws ValidationError (-> 422 {message, errors}) exactly like Laravel. Returns the validated fields.
// Rules: required nullable sometimes string numeric integer boolean email url array date date_format:
//   after: before: in: not_in: min: max: size: between: gt: gte: lt: lte: digits: regex: confirmed same: alpha_num
//   exists:table,col  unique:table,col,ignoreId,idCol  required_if:field,value  required_with:f  required_without:f
//   file image mimes:a,b mimetypes:x   (read from multer's req.file / req.files)   Custom: pass a function in an array rule list.
const { QueryTypes } = require('sequelize');
const dayjs = require('dayjs');
const { ValidationError } = require('./errors');

// PHP is_numeric() / filter_var(FILTER_VALIDATE_INT) as used by Laravel's numeric / integer rules
const phpIsNumeric = (v) => (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' && /^\s*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?\s*$/.test(v));
const phpFilterInt = (v) => {
  if (typeof v === 'number') return Number.isInteger(v);
  if (typeof v === 'boolean') return v === true;
  return typeof v === 'string' && /^[+-]?(0|[1-9]\d*)$/.test(v.trim());
};
const isEmpty = (v) => v === undefined || v === null || v === '';
const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const label = (f) => f.replace(/_/g, ' ');

// PHP-like date parsing used by the date / after / before rules (strtotime + date_parse/checkdate semantics).
const ISO_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i;
function phpTs(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v * 1000;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  const lw = t.toLowerCase();
  const day = 86400000;
  const sod = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  if (lw === 'today' || lw === 'midnight') return sod();
  if (lw === 'now') return Date.now();
  if (lw === 'tomorrow') return sod() + day;
  if (lw === 'yesterday') return sod() - day;
  const m = ISO_RE.exec(t);
  if (m) {
    const [, y, mo, d, h = '0', mi = '0', se = '0', tz] = m;
    if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > new Date(Number(y), Number(mo), 0).getDate()) return null;
    if (Number(h) > 24 || Number(mi) > 59 || Number(se) > 59) return null;
    if (tz) return Date.parse(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${mi}:${se.padStart(2, '0')}${tz.toUpperCase() === 'Z' ? 'Z' : tz.length === 5 ? tz.slice(0, 3) + ':' + tz.slice(3) : tz}`);
    return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se)).getTime();
  }
  if (/^\d+$/.test(t)) return null;
  if (!/\d{4}/.test(t)) return null;
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
}
// (PHP date_parse() of a purely relative word has no y/m/d, so checkdate() fails -> 'date' rule rejects it)
const phpDateValid = (v) => (typeof v === 'string' || typeof v === 'number') && typeof v !== 'number' && !/^\s*(today|now|tomorrow|yesterday|midnight)\s*$/i.test(v) && phpTs(v) !== null;
// PHP loose comparison between two possibly-null timestamps
function phpCmp(op, a, b) {
  if (a === null || b === null) { const x = a !== null; const y = b !== null; a = x ? 1 : 0; b = y ? 1 : 0; }
  return op === '>' ? a > b : op === '>=' ? a >= b : op === '<' ? a < b : a <= b;
}

function expandWildcards(rules, data) {
  const out = {};
  for (const [field, r] of Object.entries(rules)) {
    if (!field.includes('*')) {
      out[field] = r;
      continue;
    }
    const walk = (parts, prefix, cur) => {
      if (!parts.length) {
        out[prefix] = r;
        return;
      }
      const [head, ...rest] = parts;
      if (head === '*') {
        const ents = Array.isArray(cur) ? cur.map((v, i) => [i, v]) : cur && typeof cur === 'object' ? Object.entries(cur) : [];
        ents.forEach(([i, v]) => walk(rest, prefix ? `${prefix}.${i}` : `${i}`, v));
      } else {
        walk(rest, prefix ? `${prefix}.${head}` : head, cur == null ? undefined : cur[head]);
      }
    };
    walk(field.split('.'), '', data);
  }
  return out;
}

// Laravel validates uploads by the file CONTENT (finfo), not the client-declared name/type. Returns a mime for the formats we can recognise, else null.
const EXT_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf' };
function sniffMime(file) {
  const b = file && file.buffer;
  if (!b || !b.length) return null;
  const h = b.subarray(0, 12);
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return 'image/jpeg';
  if (h.length >= 8 && h[0] === 0x89 && h.subarray(1, 4).toString('latin1') === 'PNG' && h[4] === 0x0d && h[5] === 0x0a && h[6] === 0x1a && h[7] === 0x0a) return 'image/png';
  if (h.subarray(0, 4).toString('latin1') === 'GIF8') return 'image/gif';
  if (h.subarray(0, 2).toString('latin1') === 'BM') return 'image/bmp';
  if (h.subarray(0, 4).toString('latin1') === 'RIFF' && h.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (h.subarray(0, 4).toString('latin1') === '%PDF') return 'application/pdf';
  const head = b.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml';
  return null;
}
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']; // Laravel 11+: image rule excludes svg

function fileOf(req, field) {
  if (req.file && req.file.fieldname === field) return req.file;
  if (Array.isArray(req.files)) return req.files.find((f) => f.fieldname === field || f.fieldname === `${field}[]`);
  if (req.files && req.files[field]) return [].concat(req.files[field])[0];
  return undefined;
}

async function validate(req, rules, messages = {}, sequelize = require('../config/db')) {
  const data = { ...(req.query || {}), ...(req.body || {}) };
  // $request->all() also contains uploaded files: nested ones (images[0][file]) make `images.*.type` style wildcards expand
  if (Array.isArray(req.files) && req.files.some((f) => /[.\[]/.test(String(f.fieldname).replace(/\[\]$/, '')))) {
    const merged = JSON.parse(JSON.stringify(data));
    for (const f of req.files) {
      const parts = String(f.fieldname).replace(/\[\]$/, '').replace(/\]\[/g, '.').replace(/\[/g, '.').replace(/\]/g, '').split('.');
      if (parts.length < 2) continue;
      let cur = merged;
      parts.forEach((k, i) => {
        if (i === parts.length - 1) cur[k] = f;
        else cur = cur[k] && typeof cur[k] === 'object' ? cur[k] : (cur[k] = /^\d+$/.test(parts[i + 1]) ? [] : {});
      });
    }
    Object.keys(data).forEach((k) => delete data[k]);
    Object.assign(data, merged);
  }
  const errors = {};
  const add = (field, rule, def) => {
    (errors[field] ||= []).push(messages[`${field}.${rule}`] || messages[field] || def);
  };
  const expanded = expandWildcards(rules, data);
  // __L12: wildcard-expanded attributes keep their raw name in Laravel messages
  const implicitAttrs = new Set(Object.keys(expanded).filter((k) => !(k in rules)));
  const label = (f) => (implicitAttrs.has(f) ? f : f.replace(/_/g, ' '));
  const validated = {};

  for (const [field, ruleDef] of Object.entries(expanded)) {
    const list = Array.isArray(ruleDef) ? ruleDef : String(ruleDef).split('|');
    const names = list.map((r) => (typeof r === 'function' ? '__fn' : String(r).split(':')[0]));
    const file = fileOf(req, field);
    let value = getPath(data, field);
    if (file) value = file;
    if (names.includes('sometimes') && value === undefined) continue;

    const ctx = (n) => {
      const r = list.find((x) => typeof x === 'string' && x.split(':')[0] === n);
      return r ? r.split(':').slice(1).join(':') : undefined;
    };
    let required = names.includes('required');
    let reqMsg = `The ${label(field)} field is required.`;
    const attrOf = (f) => (f.includes('*') || implicitAttrs.has(f) ? f : f.replace(/_/g, ' '));
    if (names.includes('required_if')) {
      const [f, ...v] = ctx('required_if').split(',');
      if (!required && v.includes(String(getPath(data, f)))) { required = true; reqMsg = `The ${label(field)} field is required when ${attrOf(f)} is ${getPath(data, f)}.`; }
    }
    if (names.includes('required_with')) {
      const fs_ = ctx('required_with').split(',');
      if (!required && fs_.some((f) => !isEmpty(getPath(data, f)))) { required = true; reqMsg = `The ${label(field)} field is required when ${fs_.map(attrOf).join(' / ')} is present.`; }
    }
    if (names.includes('required_without')) {
      const fs_ = ctx('required_without').split(',');
      if (!required && fs_.some((f) => isEmpty(getPath(data, f)) && !fileOf(req, f))) { required = true; reqMsg = `The ${label(field)} field is required when ${fs_.map(attrOf).join(' / ')} is not present.`; }
    }

    // Laravel validates a PRESENT null (incl. '' converted to null by the middleware) against type rules unless the field is 'nullable'
    if ((value === null || value === '') && !required && !names.includes('nullable') && !names.includes('required_with') && !names.includes('required_without') && !names.includes('required_if')) {
      const nullMsg = { string: 'must be a string.', array: 'must be an array.', numeric: 'must be a number.', integer: 'must be an integer.', boolean: 'must be true or false.', email: 'must be a valid email address.', date: 'must be a valid date.' };
      let hit = false;
      for (const raw of list) {
        if (typeof raw !== 'string') continue;
        const [rn, ...rr] = raw.split(':');
        if (nullMsg[rn]) { add(field, rn, `The ${label(field)} field ${nullMsg[rn]}`); hit = true; }
        else if (rn === 'date_format') { add(field, rn, `The ${label(field)} field must match the format ${rr.join(':')}.`); hit = true; }
        else if (rn === 'in' || rn === 'exists') { add(field, rn, `The selected ${label(field)} is invalid.`); hit = true; }
      }
      if (hit) continue;
    }

    if (isEmpty(value) || (required && Array.isArray(value) && value.length === 0)) {
      if (required) add(field, 'required', reqMsg);
      continue; // optional empty values skip remaining rules
    }

    for (const raw of list) {
      if (typeof raw === 'function') {
        const msg = await raw(value, data);
        if (typeof msg === 'string') add(field, 'custom', msg);
        continue;
      }
      const [name, ...rest] = String(raw).split(':');
      const arg = rest.join(':');
      const args = arg ? arg.split(',') : [];
      // Laravel: size = value for numeric/integer fields, count for arrays, KB for files, length for strings
      const isNumericField = names.includes('numeric') || names.includes('integer');
      const size = Array.isArray(value) ? value.length : (isNumericField && !isNaN(Number(value))) ? Number(value) : file ? file.size / 1024 : String(value).length;
      let num; try { num = Number(value); } catch (e) { num = NaN; } // null-prototype objects (multer bodies) cannot be coerced
      const kind = file ? 'file' : Array.isArray(value) ? 'array' : isNumericField ? 'numeric' : names.includes('array') ? 'array' : 'string';
      const sz = (m) => (kind === 'array' ? m.array : kind === 'file' ? m.file : kind === 'numeric' ? m.numeric : m.string);
      const other = (k) => Number(getPath(data, k) ?? k);
      switch (name) {
        case 'string': if (typeof value !== 'string') add(field, name, `The ${label(field)} field must be a string.`); break;
        case 'numeric': if (!phpIsNumeric(value)) add(field, name, `The ${label(field)} field must be a number.`); break;
        case 'integer': if (!phpFilterInt(value)) add(field, name, `The ${label(field)} field must be an integer.`); break;
        case 'boolean': if (![true, false, 0, 1, '0', '1'].includes(value)) add(field, name, `The ${label(field)} field must be true or false.`); break;
        case 'email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) add(field, name, `The ${label(field)} field must be a valid email address.`); break;
        case 'url': if (!require('./laravelUrl').isUrl(value, args)) add(field, name, `The ${label(field)} field must be a valid URL.`); break;
        case 'array': if (value === null || typeof value !== 'object' || (file && value === file)) add(field, name, `The ${label(field)} field must be an array.`); break;
        case 'alpha_num': if (!/^[a-z0-9]+$/i.test(String(value))) add(field, name, `The ${label(field)} field must only contain letters and numbers.`); break;
        case 'date': if (!phpDateValid(value)) add(field, name, `The ${label(field)} field must be a valid date.`); break;
        case 'date_format': {
          const f = arg.replace('Y', 'YYYY').replace('m', 'MM').replace('d', 'DD').replace('H', 'HH').replace('i', 'mm').replace('s', 'ss');
          if (!dayjs(String(value), f, true).isValid()) add(field, name, `The ${label(field)} field must match the format ${arg}.`);
          break;
        }
        case 'after':
        case 'before':
        case 'after_or_equal':
        case 'before_or_equal': {
          const op = { after: '>', before: '<', after_or_equal: '>=', before_or_equal: '<=' }[name];
          let refTs = phpTs(args[0]);
          const refIsField = refTs === null;
          if (refIsField) refTs = phpTs(getPath(data, args[0]));
          if (!phpCmp(op, phpTs(value), refTs)) {
            const words = { after: 'after', before: 'before', after_or_equal: 'after or equal to', before_or_equal: 'before or equal to' }[name];
            add(field, name, `The ${label(field)} field must be a date ${words} ${refIsField ? label(args[0]) : args[0]}.`);
          }
          break;
        }
        case 'starts_with': if (!args.some((p) => String(value).startsWith(p))) add(field, name, `The ${label(field)} field must start with one of the following: ${args.join(', ')}.`); break;
        case 'in': if (Array.isArray(value) ? (!names.includes('array') || value.some((e) => !args.includes(String(e)))) : !args.includes(String(value))) add(field, name, `The selected ${label(field)} is invalid.`); break;
        case 'not_in': if (args.includes(String(value))) add(field, name, `The selected ${label(field)} is invalid.`); break;
        case 'min': if (size < Number(args[0])) add(field, name, sz({ array: `The ${label(field)} field must have at least ${args[0]} items.`, file: `The ${label(field)} field must be at least ${args[0]} kilobytes.`, numeric: `The ${label(field)} field must be at least ${args[0]}.`, string: `The ${label(field)} field must be at least ${args[0]} characters.` })); break;
        case 'max': if (size > Number(args[0])) add(field, name, sz({ array: `The ${label(field)} field must not have more than ${args[0]} items.`, file: `The ${label(field)} field must not be greater than ${args[0]} kilobytes.`, numeric: `The ${label(field)} field must not be greater than ${args[0]}.`, string: `The ${label(field)} field must not be greater than ${args[0]} characters.` })); break;
        case 'size': if (size !== Number(args[0])) add(field, name, sz({ array: `The ${label(field)} field must contain ${args[0]} items.`, file: `The ${label(field)} field must be ${args[0]} kilobytes.`, numeric: `The ${label(field)} field must be ${args[0]}.`, string: `The ${label(field)} field must be ${args[0]} characters.` })); break;
        case 'between': if (size < Number(args[0]) || size > Number(args[1])) add(field, name, sz({ array: `The ${label(field)} field must have between ${args[0]} and ${args[1]} items.`, file: `The ${label(field)} field must be between ${args[0]} and ${args[1]} kilobytes.`, numeric: `The ${label(field)} field must be between ${args[0]} and ${args[1]}.`, string: `The ${label(field)} field must be between ${args[0]} and ${args[1]} characters.` })); break;
        case 'gt': if (!(num > other(args[0]))) add(field, name, `The ${label(field)} field must be greater than ${args[0]}.`); break;
        case 'gte': if (!(num >= other(args[0]))) add(field, name, `The ${label(field)} field must be greater than or equal to ${args[0]}.`); break;
        case 'lt': if (!(num < other(args[0]))) add(field, name, `The ${label(field)} field must be less than ${args[0]}.`); break;
        case 'lte': if (!(num <= other(args[0]))) add(field, name, `The ${label(field)} field must be less than or equal to ${args[0]}.`); break;
        case 'digits': if (!new RegExp(`^\\d{${args[0]}}$`).test(String(value))) add(field, name, `The ${label(field)} field must be ${args[0]} digits.`); break;
        case 'regex': {
          const m = arg.match(/^\/(.*)\/([a-z]*)$/);
          if (m && !new RegExp(m[1], m[2]).test(String(value))) add(field, name, `The ${label(field)} field format is invalid.`);
          break;
        }
        case 'confirmed': if (value !== data[`${field}_confirmation`]) add(field, name, `The ${label(field)} field confirmation does not match.`); break;
        case 'same': if (value !== getPath(data, args[0])) add(field, name, `The ${label(field)} field and ${args[0]} must match.`); break;
        case 'file': if (!file) add(field, name, `The ${label(field)} field must be a file.`); break;
        case 'image': if (!file || !(file.buffer ? IMAGE_MIMES.includes(sniffMime(file)) : /^image\//.test(file.mimetype))) add(field, name, `The ${label(field)} field must be an image.`); break;
        case 'mimes': if (!file || !((sniffed) => (sniffed ? args.some((e) => EXT_MIME[e] === sniffed) : (() => { const ext = (file.originalname.split('.').pop() || '').toLowerCase(); return !(ext in EXT_MIME && file.buffer) && args.includes(ext); })()))(sniffMime(file))) add(field, name, `The ${label(field)} field must be a file of type: ${args.join(', ')}.`); break;
        case 'mimetypes': if (!file || !args.includes(sniffMime(file) || file.mimetype)) add(field, name, `The ${label(field)} field must be a file of type: ${args.join(', ')}.`); break;
        case 'exists': {
          if (errors[field] && errors[field].length) break;
          const [table, col = field.split('.').pop()] = args;
          const [row] = await sequelize.query(`SELECT 1 AS x FROM \`${table}\` WHERE \`${col}\` = ? LIMIT 1`, { replacements: [value], type: QueryTypes.SELECT });
          if (!row) add(field, name, `The selected ${label(field)} is invalid.`);
          break;
        }
        case 'unique': {
          if (errors[field] && errors[field].length) break;
          const [table, col = field.split('.').pop(), ignore, idCol = 'id'] = args;
          let sql = `SELECT 1 AS x FROM \`${table}\` WHERE \`${col}\` = ?`;
          const rep = [value];
          if (ignore) { sql += ` AND \`${idCol}\` <> ?`; rep.push(ignore); }
          const [row] = await sequelize.query(`${sql} LIMIT 1`, { replacements: rep, type: QueryTypes.SELECT });
          if (row) add(field, name, `The ${label(field)} has already been taken.`);
          break;
        }
        default: break; // required / nullable / sometimes handled above
      }
    }
    if (!file) validated[field] = value;
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);

  // re-nest dotted keys
  const out = {};
  for (const [k, v] of Object.entries(validated)) {
    if (!k.includes('.')) { out[k] = v; continue; }
    const parts = k.split('.');
    let cur = out;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) cur[p] = v;
      else cur = cur[p] ||= /^\d+$/.test(parts[i + 1]) ? [] : {};
    });
  }
  return out;
}

module.exports = validate;

module.exports.validate = validate; // support both `const validate = require(..)` and `const { validate } = require(..)`
