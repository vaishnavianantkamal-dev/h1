// Minimal emulation of Laravel's `web` middleware group for the routes that need it
// (EncryptCookies, StartSession, ShareErrorsFromSession, ValidateCsrfToken):
//   * cookies `hobit-session` + `XSRF-TOKEN` in Laravel's encrypted-cookie format (AES-256-CBC + HMAC, "v2" prefix)
//   * server-side session (in memory): _token, previous URL, flash data (errors / old input) with Laravel's aging rules
//   * CSRF check on non-read verbs  -> 419 "Page Expired" (HTML) / {"message":"CSRF token mismatch."} (JSON)
// Usage: router.use(webSession.web);   in handlers: req.session.token, req.session.errors('otp'), req.session.flashErrors({...}),
//        webSession.redirectBack(req, res)   (== redirect()->back()->withErrors(..)->withInput(..))
const crypto = require('crypto');
const config = require('../config');
const lv = require('./laravel');

const COOKIE_NAME = process.env.SESSION_COOKIE || 'hobit-session';
const LIFETIME_MIN = Number(process.env.SESSION_LIFETIME || 120);

const key = (() => {
  const k = String(config.appKey || '');
  if (k.startsWith('base64:')) return Buffer.from(k.slice(7), 'base64');
  if (k.length === 32) return Buffer.from(k);
  return crypto.randomBytes(32); // no APP_KEY: cookies are only valid for this process
})();

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const random = (n) => { const b = crypto.randomBytes(n); let o = ''; for (let i = 0; i < n; i++) o += ALNUM[b[i] % ALNUM.length]; return o; };

// ---- Illuminate\Encryption\Encrypter (AES-256-CBC) + CookieValuePrefix -------------------------------------------
const prefix = (name) => crypto.createHmac('sha1', key).update(name + 'v2').digest('hex') + '|';
function encrypt(plain) {
  const iv = crypto.randomBytes(16);
  const c = crypto.createCipheriv('aes-256-cbc', key, iv);
  const value = Buffer.concat([c.update(plain, 'utf8'), c.final()]).toString('base64');
  const ivB = iv.toString('base64');
  const mac = crypto.createHmac('sha256', key).update(ivB + value).digest('hex');
  return Buffer.from(JSON.stringify({ iv: ivB, value, mac, tag: '' })).toString('base64');
}
function decrypt(payload) {
  try {
    const p = JSON.parse(Buffer.from(String(payload), 'base64').toString('utf8'));
    const mac = crypto.createHmac('sha256', key).update(p.iv + p.value).digest('hex');
    if (typeof p.mac !== 'string' || mac.length !== p.mac.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(p.mac))) return null;
    const d = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(p.iv, 'base64'));
    return Buffer.concat([d.update(Buffer.from(p.value, 'base64')), d.final()]).toString('utf8');
  } catch (e) { return null; }
}
const sealCookie = (name, value) => encrypt(prefix(name) + value);
function openCookie(name, raw) {
  if (!raw) return null;
  let v; try { v = decodeURIComponent(raw); } catch (e) { return null; }
  const plain = decrypt(v);
  if (plain === null || !plain.startsWith(prefix(name))) return null;
  return plain.slice(41);
}

// ---- session store ----------------------------------------------------------------------------------------------
const store = new Map(); // id -> { token, data, flashNew, flashOld, prevUrl, touched }
class Session {
  constructor(id, saved) {
    this.id = id;
    Object.assign(this, saved || { token: random(40), data: {}, flashNew: [], flashOld: [], prevUrl: null });
  }
  flash(k, v) { this.data[k] = v; this.flashOld = this.flashOld.filter((x) => x !== k); if (!this.flashNew.includes(k)) this.flashNew.push(k); }
  get(k, d) { return k in this.data ? this.data[k] : d; }
  // flash('errors', MessageBag) / @error('otp')
  flashErrors(errors) { this.flash('errors', errors); }
  errors(field) { const e = this.get('errors', {}); return (e && e[field]) || []; }
  ageFlashData() {
    for (const k of this.flashOld) delete this.data[k];
    this.flashOld = this.flashNew; this.flashNew = [];
  }
}

const expiresHeader = (d) => d.toUTCString();
function cookieString(name, rawValue, { httpOnly }) {
  const exp = new Date(Date.now() + LIFETIME_MIN * 60000);
  return `${name}=${encodeURIComponent(rawValue)}; expires=${expiresHeader(exp)}; Max-Age=${LIFETIME_MIN * 60}; path=/; ${httpOnly ? 'httponly; ' : ''}samesite=lax`;
}

function parseCookies(h) {
  const out = {};
  for (const part of String(h || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  return out;
}

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const fullUrl = (req) => baseUrl(req) + req.originalUrl.replace(/\?$/, '');
const isRead = (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method);

// StartSession + VerifyCsrfToken
function web(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const id = openCookie(COOKIE_NAME, cookies[COOKIE_NAME]);
  const sess = new Session(id && store.has(id) ? id : random(40), id && store.get(id));
  req.session = sess;
  let addXsrf = false;

  const finalize = () => {
    if (res.__sessionDone) return;
    res.__sessionDone = true;
    if (req.method === 'GET' && !req.xhr && req.headers['x-requested-with'] !== 'XMLHttpRequest' && !/prefetch/i.test(String(req.headers.purpose || req.headers['sec-purpose'] || ''))) sess.prevUrl = fullUrl(req);
    sess.ageFlashData();
    store.set(sess.id, { token: sess.token, data: sess.data, flashNew: sess.flashNew, flashOld: sess.flashOld, prevUrl: sess.prevUrl });
    const set = [];
    if (addXsrf) set.push(cookieString('XSRF-TOKEN', sealCookie('XSRF-TOKEN', sess.token), { httpOnly: false }));
    set.push(cookieString(COOKIE_NAME, sealCookie(COOKIE_NAME, sess.id), { httpOnly: true }));
    const cur = res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie', [].concat(cur || [], set));
  };
  const wh = res.writeHead;
  res.writeHead = function writeHead(...a) { finalize(); return wh.apply(this, a); };

  if (!isRead(req)) {
    const input = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    let token = input._token || req.headers['x-csrf-token'];
    if (!token && req.headers['x-xsrf-token']) {
      const dec = decrypt(decodeURIComponent(String(req.headers['x-xsrf-token'])));
      token = dec === null ? '' : dec.slice(41);
    }
    const ok = typeof token === 'string' && token.length === sess.token.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sess.token));
    if (!ok) {
      if (lv.expectsJson(req)) return res.status(419).prettyJson({ message: 'CSRF token mismatch.' });
      return lv.sendHtmlError(res, 419);
    }
  }
  addXsrf = true;
  return next();
}

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
function redirect(res, url) {
  const u = escHtml(url);
  res.status(302).set('Location', url).set('Content-Type', 'text/html; charset=utf-8').end(
    `<!DOCTYPE html>\n<html>\n    <head>\n        <meta charset="UTF-8" />\n        <meta http-equiv="refresh" content="0;url='${u}'" />\n\n        <title>Redirecting to ${u}</title>\n    </head>\n    <body>\n        Redirecting to <a href="${u}">${u}</a>.\n    </body>\n</html>`,
  );
}

// UrlGenerator::previous(): Referer header, else the session's previous URL, else '/'
const previousUrl = (req) => req.headers.referer || (req.session && req.session.prevUrl) || baseUrl(req);

// redirect()->back()->withErrors($errors)  (+ withInput: not needed by the views)
function redirectBack(req, res, errors) {
  if (errors && req.session) req.session.flashErrors(errors);
  return redirect(res, previousUrl(req));
}

module.exports = { web, redirect, redirectBack, previousUrl, baseUrl };
