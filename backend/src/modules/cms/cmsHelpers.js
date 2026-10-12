// Shared helpers for the CMS controllers (app/Http/Controllers/CMS/*).
//
// - cmsUpload:   multer `any()` middleware that KEEPS raw field names ("cards[0][image]", "icon[]").
//                (src/middleware/upload.js strips the "[n]" suffix which would lose the index alignment these
//                 controllers rely on, so the CMS module uses its own memory-storage multer instance.)
// - wrap(req):   Laravel-style $request view: all()/input()/has()/filled()/boolean()/hasFile()/file() where
//                uploaded files are merged into the input tree exactly like Laravel does ("cards.0.image").
// - r.validate:  Validator::make($request->all(), $rules) -> { data } | { errors }; the CMS controllers answer
//                validation failures with {success:false,message:'Validation error',errors} (422), NOT Laravel's default shape.
const multer = require('multer');
const { ValidationError } = require('../../utils/errors');
const validateRules = require('../../utils/validate');
const ImageUploadHelper = require('../../helpers/ImageUploadHelper');

const multerAny = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }).any();
// PHP only parses multipart bodies for POST: on PUT/PATCH/DELETE the fields and files are simply not there.
const cmsUpload = (req, res, next) => multerAny(req, res, (err) => {
  if (err) return next(err);
  if ((req.__realMethod || req.method) !== 'POST' && /multipart\/form-data/i.test(req.headers['content-type'] || '')) { req.body = {}; req.files = []; }
  next();
});

// ImageUploadHelper::validationRules()
const IMG = ['image', 'mimes:jpeg,jpg,png,gif,webp,svg', 'max:2048'];

// ---------------------------------------------------------------- small utilities
const isFile = (x) => !!x && typeof x === 'object' && Buffer.isBuffer(x.buffer) && 'originalname' in x;
const getPath = (obj, p) => String(p).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
// Present-but-null value on a rule list without nullable/required: Laravel still runs the rules on null
// (string/integer/boolean/array ... fail). utils/validate skips empty values, so such nulls are swapped for this sentinel.
const NULLV = (() => { const f = function () {}; Object.defineProperty(f, 'toString', { value: () => '' }); Object.defineProperty(f, 'valueOf', { value: () => NaN }); return f; })();
// Laravel validated(): an array rule that has child rules ("cards" + "cards.*.question") only returns the validated children.
function expandKey(key, data) {
  const out = [];
  const walk = (parts, prefix, cur) => {
    if (!parts.length) { out.push(prefix); return; }
    const [head, ...rest] = parts;
    if (head === '*') {
      if (cur && typeof cur === 'object') for (const k of Object.keys(cur)) walk(rest, prefix ? prefix + '.' + k : k, cur[k]);
    } else walk(rest, prefix ? prefix + '.' + head : head, cur == null ? undefined : cur[head]);
  };
  walk(key.split('.'), '', data);
  return out;
}
function pruneArrays(out, rules, all) {
  const keys = Object.keys(rules);
  const isArr = (k) => hasNames(rules[k]).includes('array') && keys.some((o) => o.startsWith(k + '.'));
  for (const K of keys) {
    if (!isArr(K) || K.includes('*')) continue;
    const base = getPath(all, K);
    if (base === undefined || base === null || typeof base !== 'object' || getPath(out, K) === undefined) continue;
    const fresh = Array.isArray(base) ? [] : {};
    const setIn = (root, path, val) => {
      const segs = path.split('.');
      let cur = root;
      segs.forEach((seg, i) => {
        if (i === segs.length - 1) { cur[seg] = val; return; }
        if (cur[seg] === undefined || cur[seg] === null || typeof cur[seg] !== 'object') cur[seg] = /^\d+$/.test(segs[i + 1]) ? [] : {};
        cur = cur[seg];
      });
    };
    for (const C of keys) {
      if (!C.startsWith(K + '.') || isArr(C)) continue;
      for (const P of expandKey(C, all)) {
        const v = getPath(all, P);
        if (v === undefined || isFile(v)) continue;
        setIn(fresh, P.slice(K.length + 1), unmark(v));
      }
    }
    const segs = K.split('.');
    let cur = out;
    for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
    cur[segs[segs.length - 1]] = fresh;
  }
  return out;
}
const hasNames = (rule) => (Array.isArray(rule) ? rule : String(rule).split('|')).map((x) => (typeof x === 'function' ? '__fn' : String(x).split(':')[0]));
// uploaded files are looked up by dotted field name (vfiles); in the value tree they are only a placeholder so that
// wildcard expansion never walks into a file object's properties
const cloneForValidation = (v) => {
  if (isFile(v)) return '__file__';
  if (Array.isArray(v)) return v.map(cloneForValidation);
  if (v && typeof v === 'object' && (v.constructor === Object || Object.getPrototypeOf(v) === null)) { const o = {}; for (const k of Object.keys(v)) o[k] = cloneForValidation(v[k]); return o; }
  return v;
};
function markNulls(rules, all) {
  const out = cloneForValidation(all);
  const set = (parts, cur, rule) => {
    const [head, ...rest] = parts;
    if (cur === null || typeof cur !== 'object') return;
    if (head === '*') { for (const k of Object.keys(cur)) { if (!rest.length) { if (cur[k] === null) cur[k] = NULLV; } else set(rest, cur[k], rule); } return; }
    if (!rest.length) { if (cur[head] === null) cur[head] = NULLV; return; }
    set(rest, cur[head], rule);
  };
  for (const [key, rule] of Object.entries(rules)) {
    const n = hasNames(rule);
    if (n.includes('nullable') || n.some((x) => x.startsWith('required'))) continue;
    if (!n.some((x) => ['string', 'integer', 'numeric', 'boolean', 'array', 'email', 'url', 'image', 'file', 'date'].includes(x))) continue;
    set(key.split('.'), out, rule);
  }
  return out;
}
const unmark = (v) => {
  if (v === NULLV) return null;
  if (Array.isArray(v)) return v.map(unmark);
  if (v && typeof v === 'object' && (v.constructor === Object || Object.getPrototypeOf(v) === null)) { const o = {}; for (const k of Object.keys(v)) o[k] = unmark(v[k]); return o; }
  return v;
};
const bool = (v) => [true, 1, '1', 'true', 'on', 'yes'].includes(v);
// PHP ?? : null or undefined -> fallback
const nz = (v, d) => (v === undefined || v === null ? d : v);

const clean = (v) => {
  if (typeof v === 'string') { const t = v.trim(); return t === '' ? null : t; }
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object' && (v.constructor === Object || Object.getPrototypeOf(v) === null)) {
    const o = {};
    for (const k of Object.keys(v)) o[k] = clean(v[k]);
    return o;
  }
  return v;
};

// foreach ($arr as $i => $v): arrays -> numeric index; objects -> key (numeric strings become numbers)
function entries(x) {
  if (Array.isArray(x)) return x.map((v, i) => [i, v]).filter(([, v]) => v !== undefined);
  if (x && typeof x === 'object') return Object.entries(x).map(([k, v]) => [/^\d+$/.test(k) ? Number(k) : k, v]);
  return [];
}

// (array) $model->images  (JSON cast arrays; tolerate raw JSON strings)
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined || v === '') return [];
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [p]; } catch (_) { return [v]; } }
  return [v];
}

// Illuminate\Support\Str::slug($value)
function slug(value) {
  let s = String(value).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/@/g, '-at-');
  s = s.replace(/[^-\p{L}\p{N}\s]+/gu, '');
  s = s.replace(/[-\s]+/g, '-');
  return s.replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------- request wrapper
function segmentsOf(name) {
  const m = String(name).match(/^([^[]+)((?:\[[^\]]*\])*)$/);
  if (!m) return [String(name)];
  const segs = [m[1]];
  const re = /\[([^\]]*)\]/g;
  let x;
  while ((x = re.exec(m[2]))) segs.push(x[1]);
  return segs;
}

// assign a value into a nested tree, returns the dotted path that was used ("" segment = next sequential index)
function setPath(root, segs, value) {
  let cur = root;
  const used = [];
  for (let i = 0; i < segs.length; i++) {
    let seg = segs[i];
    if (seg === '') seg = Array.isArray(cur) ? cur.length : Object.keys(cur).length;
    used.push(String(seg));
    if (i === segs.length - 1) { cur[seg] = value; break; }
    const nextSeg = segs[i + 1];
    if (cur[seg] === null || typeof cur[seg] !== 'object' || isFile(cur[seg])) {
      cur[seg] = nextSeg === '' || /^\d+$/.test(nextSeg) ? [] : {};
    }
    cur = cur[seg];
  }
  return used.join('.');
}

function wrap(req) {
  if (req._cms) return req._cms;
  const all = { ...(req.query || {}), ...clean(req.body && typeof req.body === 'object' ? req.body : {}) };
  const vfiles = []; // copies of the multer files whose fieldname is the dotted path (what utils/validate looks up)
  for (const f of Array.isArray(req.files) ? req.files : []) {
    const dotted = setPath(all, segmentsOf(f.fieldname), f);
    vfiles.push({ ...f, fieldname: dotted });
  }

  const r = {
    all: () => all,
    input: (key, def = null) => {
      if (key === undefined) return all;
      const v = getPath(all, key);
      return v === undefined ? def : v;
    },
    has: (key) => getPath(all, key) !== undefined,
    filled: (key) => { const v = getPath(all, key); return v !== undefined && v !== null && v !== ''; },
    boolean: (key, def = false) => {
      const v = getPath(all, key);
      return v === undefined || v === null ? def : bool(v);
    },
    // $request->file('x'): UploadedFile | UploadedFile[] | null
    file: (key) => {
      const v = getPath(all, key);
      if (isFile(v)) return v;
      if (Array.isArray(v)) return v.filter(isFile);
      if (v && typeof v === 'object') return Object.values(v).filter(isFile);
      return null;
    },
    hasFile: (key) => {
      const f = r.file(key);
      return Array.isArray(f) ? f.length > 0 : !!f;
    },
    // Validator::make($request->all(), $rules, $messages)
    validate: async (rules, messages = {}) => {
      try {
        let out = await validateRules({ query: {}, body: markNulls(rules, all), files: vfiles }, rules, messages);
        out = pruneArrays(unmark(out), rules, all);
        for (const [key, rule] of Object.entries(rules)) {
          if (key.includes('*') || key.includes('.')) continue;
          // validated() keeps explicit nulls (nullable fields) - utils/validate drops empty values
          if (all[key] === null) out[key] = null;
          const list = Array.isArray(rule) ? rule : String(rule).split('|');
          if (list.includes('boolean') && out[key] !== undefined && out[key] !== null) out[key] = bool(out[key]);
        }
        return { data: out };
      } catch (e) {
        if (e instanceof ValidationError) return { errors: e.errors };
        throw e;
      }
    },
  };
  req._cms = r;
  return r;
}

// Eloquent create() leaves the attributes exactly as assigned: a form-encoded "5" stays the string "5" unless the model
// casts that column to integer. Sequelize/toJSON would hand back the number, so overlay the assigned strings.
function assigned(row, data, castInts = []) {
  const j = row.toJSON();
  for (const k of Object.keys(data || {})) {
    if (typeof data[k] === 'string' && typeof j[k] === 'number' && !castInts.includes(k)) j[k] = data[k];
  }
  return j;
}

// ---------------------------------------------------------------- responses
const ok = (res, body, status = 200) => res.status(status).json(body);
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });
const invalid = (res, errors) => res.status(422).json({ success: false, message: 'Validation error', errors });

// Resolve the service scope (?type=) from the request, falling back to "cleaner" (shared by benefits/why-choose/policies)
const TYPE_DEFAULT = 'cleaner';
const serviceType = (r) => {
  const type = String(nz(r.input('type', TYPE_DEFAULT), '')).trim();
  return type !== '' ? type : TYPE_DEFAULT;
};

// whereNotIn('id', $ids) - Eloquent ignores an empty list
const whereNotInIds = (Op, ids) => (ids.length ? { id: { [Op.notIn]: ids } } : {});

// ---------------------------------------------------------------- single-row section factory
// Used by the "single entry" CMS sections (hero, service, contact, header, footer...).
//   opt.model()      -> Sequelize model
//   opt.images       -> [{field, folder}] single image fields handled on store/update (replace-on-upload)
//   opt.fresh        -> update returns $model->fresh()
function singleton(opt) {
  const { model, notFound, existsMsg, createdMsg, updatedMsg, storeRules, updateRules, images = [], fresh = false } = opt;
  return {
    async index(req, res) {
      const row = await model().findOne();
      if (!row) return fail(res, notFound, 404);
      return ok(res, { success: true, data: row });
    },

    async store(req, res) {
      if ((await model().count()) > 0) return fail(res, existsMsg, 400);
      const r = wrap(req);
      const v = await r.validate(storeRules);
      if (v.errors) return invalid(res, v.errors);
      const data = v.data;
      for (const { field, folder } of images) {
        if (r.hasFile(field)) data[field] = await ImageUploadHelper.upload(r.file(field), folder);
      }
      const row = await model().create(data);
      return ok(res, { success: true, message: createdMsg, data: row }, 201);
    },

    async update(req, res) {
      const row = await model().findOne();
      if (!row) return fail(res, notFound, 404);
      const r = wrap(req);
      const v = await r.validate(updateRules);
      if (v.errors) return invalid(res, v.errors);
      const data = v.data;
      for (const { field, folder } of images) {
        if (r.hasFile(field)) {
          if (row[field]) await ImageUploadHelper.delete(row[field]);
          data[field] = await ImageUploadHelper.upload(r.file(field), folder);
        }
      }
      await row.update(data);
      if (fresh) await row.reload();
      return ok(res, { success: true, message: updatedMsg, data: row });
    },
  };
}

module.exports = {
  cmsUpload, IMG, ImageUploadHelper,
  isFile, getPath, bool, nz, clean, entries, asArray, slug, wrap,
  ok, fail, invalid, assigned, whereNotInIds, serviceType, singleton,
};
