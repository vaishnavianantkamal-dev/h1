// Framework-level Laravel behaviours: HandleCors (config/cors.php), json_encode flags, default headers,
// expectsJson()-aware error rendering (HTML error pages / redirects), OPTIONS answers.
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { Readable } = require('stream');
const Busboy = require('busboy');
const appendField = require('append-field');

const PAGES = path.join(__dirname, '..', 'resources', 'errors');
const read = (f) => fs.readFileSync(path.join(PAGES, f), 'utf8');
let minimal; let symfony;

// ---- json_encode ---------------------------------------------------------------------------------------------
// response()->json() = json_encode default flags (escapes "/" and non-ASCII); exception renderer (abort(), 404, 405,
// throttle) = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES (non-ASCII still escaped).
function phpJson(value, pretty) {
  const s = JSON.stringify(value, null, pretty ? 4 : undefined);
  if (s === undefined) return 'null';
  const uni = (x) => x.replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  if (pretty) return uni(s); // JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES (observed: non-ASCII is still \u-escaped)
  return uni(s.replace(/\//g, '\\/'));
}

const STATUS_TEXT = {
  400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
  406: 'Not Acceptable', 408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed',
  413: 'Content Too Large', 415: 'Unsupported Media Type', 416: 'Range Not Satisfiable', 417: 'Expectation Failed', 418: "I'm a teapot",
  419: 'Page Expired', 421: 'Misdirected Request', 422: 'Unprocessable Content', 423: 'Locked', 428: 'Precondition Required',
  429: 'Too Many Requests', 431: 'Request Header Fields Too Large', 500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
  503: 'Service Unavailable', 504: 'Gateway Timeout',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const LARAVEL_VIEWS = { 401: 'Unauthorized', 402: 'Payment Required', 403: null, 404: 'Not Found', 419: 'Page Expired', 429: 'Too Many Requests', 500: 'Server Error', 503: 'Service Unavailable' };

function errorPage(status, message) {
  if (status in LARAVEL_VIEWS) {
    minimal = minimal || read('laravel-minimal.html');
    const msg = status === 403 ? (message || 'Forbidden') : LARAVEL_VIEWS[status];
    const title = status === 403 ? 'Forbidden' : LARAVEL_VIEWS[status];
    return minimal.replace('@@TITLE@@', () => esc(title)).replace('@@CODE@@', String(status)).replace('@@MSG@@', () => esc(msg));
  }
  symfony = symfony || read('symfony.html');
  const text = STATUS_TEXT[status] || 'Whoops, looks like something went wrong.';
  return symfony.replace(/@@TEXT@@/g, () => text).replace('@@CODE@@', String(status));
}

// ---- Request::expectsJson() ----------------------------------------------------------------------------------
function acceptable(req) {
  const h = req.headers.accept;
  if (!h) return [];
  return h.split(',').map((p, i) => {
    const [t, ...params] = p.trim().split(';');
    let q = 1;
    for (const x of params) { const m = /^\s*q\s*=\s*([\d.]+)/.exec(x); if (m) q = parseFloat(m[1]); }
    return { t: t.trim(), q, i };
  }).filter((x) => x.t).sort((a, b) => b.q - a.q || a.i - b.i).map((x) => x.t);
}
function wantsJson(req) { const a = acceptable(req)[0]; return !!a && (a.includes('/json') || a.includes('+json')); }
function expectsJson(req) {
  const a = acceptable(req);
  const any = !a.length || a[0] === '*/*' || a[0] === '*';
  return (req.headers['x-requested-with'] === 'XMLHttpRequest' && !req.headers['x-pjax'] && any) || wantsJson(req);
}

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

function redirectBack(req, res) {
  const url = req.headers.referer || baseUrl(req);
  const u = esc(url);
  res.status(302).set('Location', url).set('Content-Type', 'text/html; charset=utf-8').end(
    `<!DOCTYPE html>\n<html>\n    <head>\n        <meta charset="UTF-8" />\n        <meta http-equiv="refresh" content="0;url='${u}'" />\n\n        <title>Redirecting to ${u}</title>\n    </head>\n    <body>\n        Redirecting to <a href="${u}">${u}</a>.\n    </body>\n</html>`,
  );
}
function sendHtmlError(res, status, message) {
  res.status(status).set('Content-Type', 'text/html; charset=utf-8').end(errorPage(status, message));
}

// ---- PHP parse_str() semantics for query strings / application/x-www-form-urlencoded bodies ---------------------
// last duplicate wins, a[]=1&a[]=2 appends, "a.b" / "a b" top-level names become "a_b", max_input_vars = 1000, nesting <= 64
function phpDecode(s) {
  try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s.replace(/\+/g, ' ').replace(/%([0-9a-fA-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))); }
}
function phpParseQuery(str) {
  const root = new Map();
  let vars = 0;
  for (const part of String(str || '').split('&')) {
    if (part === '') continue;
    if (vars >= 1000) break;
    const eq = part.indexOf('=');
    let k = phpDecode(eq === -1 ? part : part.slice(0, eq));
    const v = eq === -1 ? '' : phpDecode(part.slice(eq + 1));
    k = k.replace(/^ +/, '');
    if (k === '') continue;
    const br = k.indexOf('[');
    let name = br === -1 ? k : k.slice(0, br);
    let rest = br === -1 ? '' : k.slice(br);
    if (name === '') continue;
    name = name.replace(/[ .[]/g, '_');
    const keys = [name];
    // sub keys: consecutive [..] groups; anything after a malformed group is ignored (as PHP does)
    while (rest.startsWith('[') && keys.length < 64) {
      const close = rest.indexOf(']');
      if (close === -1) { if (keys.length === 1) keys[0] = name + '_' + rest.slice(1).replace(/[ .[]/g, '_'); break; }
      keys.push(rest.slice(1, close));
      rest = rest.slice(close + 1);
    }
    vars += 1;
    let node = root;
    for (let i = 0; i < keys.length; i += 1) {
      let key = keys[i];
      const last = i === keys.length - 1;
      if (key === '' && i > 0) { // append
        let max = -1; for (const kk of node.keys()) if (/^(0|[1-9]\d*)$/.test(kk) && Number(kk) > max) max = Number(kk);
        key = String(max + 1);
      }
      if (last) { node.set(key, v); break; }
      let child = node.get(key);
      if (!(child instanceof Map)) { child = new Map(); node.set(key, child); }
      node = child;
    }
  }
  const toObj = (m) => {
    const ks = [...m.keys()];
    const isList = ks.length > 0 && ks.every((k, i) => k === String(i));
    if (isList) return ks.map((k) => (m.get(k) instanceof Map ? toObj(m.get(k)) : m.get(k)));
    const o = {};
    for (const k of ks) o[k] = m.get(k) instanceof Map ? toObj(m.get(k)) : m.get(k);
    return o;
  };
  return toObj(root);
}

// ---- multipart/form-data on POST: PHP always fills $_POST, even on routes that never expect files -----------------
// Buffers the body, parses the plain fields into req.body and replays the raw bytes so route-level multer still sees the files.
function multipartFields(req, res, next) {
  if (req.method !== 'POST' || !/^multipart\/form-data/i.test(req.headers['content-type'] || '')) return next();
  const chunks = [];
  let done = false;
  req.on('data', (c) => chunks.push(c));
  req.on('error', (e) => { if (!done) { done = true; next(e); } });
  req.on('end', () => {
    if (done) return;
    done = true;
    const buf = Buffer.concat(chunks);
    const body = Object.create(null);
    const finish = () => {
      req.body = body;
      req.pipe = (dest, opts) => Readable.from([buf]).pipe(dest, opts);
      next();
    };
    let bb;
    try { bb = Busboy({ headers: req.headers }); } catch (e) { return finish(); }
    bb.on('field', (name, val) => { try { appendField(body, name, val); } catch (e) { /* ignore */ } });
    bb.on('file', (name, stream) => stream.resume());
    bb.on('error', () => finish());
    bb.on('close', finish);
    try { bb.end(buf); } catch (e) { finish(); }
  });
}

// ---- Symfony Request::getMethod() with Laravel's enableHttpMethodParameterOverride() ---------------------------
// POST + X-HTTP-Method-Override header, or "_method" in the body / query string, re-routes the request (before TrimStrings runs).
const KNOWN_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'PATCH', 'PURGE', 'TRACE'];
function methodOverride(req, res, next) {
  if (req.method !== 'POST') return next();
  let m = req.headers['x-http-method-override'];
  if (!m) {
    const fromBody = req.body && typeof req.body === 'object' ? req.body._method : undefined;
    m = fromBody !== undefined ? fromBody : (req.query && req.query._method !== undefined ? req.query._method : 'POST');
  }
  // non-scalar (array) -> InputBag BadRequestException; invalid characters -> SuspiciousOperationException; both render as 400 "Bad request."
  // (thrown before HandleCors runs, so no CORS/Vary headers)
  const bad = () => { res.removeHeader('Vary'); return expectsJson(req) ? res.status(400).prettyJson({ message: 'Bad request.' }) : sendHtmlError(res, 400); };
  if (m && typeof m === 'object') return bad();
  if (typeof m !== 'string') return next();
  m = m.toUpperCase();
  if (!KNOWN_METHODS.includes(m) && !/^[A-Z]+$/.test(m)) return bad();
  req.__realMethod = req.__realMethod || req.method;
  req.method = m;
  return next();
}

// ---- res.json override + default headers --------------------------------------------------------------------
function base(req, res, next) {
  res.removeHeader('X-Powered-By');
  res.setHeader('Cache-Control', 'no-cache, private');
  res.json = function json(obj) {
    const ct = this.getHeader('Content-Type');
    if (!ct || /^text\/html/.test(String(ct))) this.setHeader('Content-Type', 'application/json');
    const body = phpJson(obj, this.locals && this.locals.__pretty);
    this.setHeader('Content-Length', Buffer.byteLength(body));
    return this.end(body);
  };
  res.prettyJson = function prettyJson(obj) { this.locals = this.locals || {}; this.locals.__pretty = true; return this.json(obj); };
  next();
}

// ---- fruitcake/php-cors + Illuminate\Http\Middleware\HandleCors -----------------------------------------------
const CORS_PATHS = [/^\/api\/.*/, /^\/sanctum\/csrf-cookie$/];
function addVary(res, v) {
  const cur = res.getHeader('Vary');
  if (!cur) return res.setHeader('Vary', v);
  if (!String(cur).split(',').map((x) => x.trim().toLowerCase()).includes(v.toLowerCase())) return res.setHeader('Vary', `${cur}, ${v}`);
  return undefined;
}
function cors(req, res, next) {
  if (!CORS_PATHS.some((r) => r.test(req.path))) return next();
  const origin = req.headers.origin;
  const allowed = !!origin && config.corsOrigins.includes(origin);
  const configureOrigin = () => { addVary(res, 'Origin'); if (allowed) res.setHeader('Access-Control-Allow-Origin', origin); };
  const sameHost = origin === baseUrl(req);
  if (origin && !sameHost && req.method === 'OPTIONS' && req.headers['access-control-request-method']) {
    res.status(204).set('Content-Type', 'text/html; charset=UTF-8');
    configureOrigin();
    if (allowed) {
      res.setHeader('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
      res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '');
      addVary(res, 'Access-Control-Request-Method');
      addVary(res, 'Access-Control-Request-Headers');
      res.setHeader('Access-Control-Max-Age', '0');
    }
    addVary(res, 'Access-Control-Request-Method');
    return res.end();
  }
  if (req.method === 'OPTIONS') addVary(res, 'Access-Control-Request-Method');
  configureOrigin();
  return next();
}

// Laravel answers OPTIONS on a known URI with 200 + Allow (comma, no space) and an empty text/html body.
function options(methodsFor) {
  return (req, res, next) => {
    if (req.method !== 'OPTIONS') return next();
    const allowed = methodsFor(req);
    if (!allowed.length) return next();
    return res.status(200).set('Allow', allowed.join(',')).set('Content-Type', 'text/html; charset=utf-8').end();
  };
}

module.exports = { methodOverride, multipartFields, phpParseQuery, base, cors, options, phpJson, errorPage, sendHtmlError, redirectBack, expectsJson, wantsJson, STATUS_TEXT };
