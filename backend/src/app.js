const express = require('express');
// Laravel routes are case sensitive (Express routers are not by default): patch before any module creates a Router
{ const origRouter = express.Router; const patched = function Router(opts) { return origRouter({ caseSensitive: true, ...opts }); }; Object.assign(patched, origRouter); patched.prototype = origRouter.prototype; express.Router = patched; }
const morgan = require('morgan');
const config = require('./config');
const requestHelpers = require('./middleware/request');
const { notFound, errorHandler, methodsFor } = require('./middleware/errorHandler');
const lv = require('./middleware/laravel');
const storage = require('./utils/storage');
const routes = require('./routes');

// Carbon::jsonSerialize() format: UTC ISO-8601 with microseconds (2026-10-01T04:30:00.000000Z)
Date.prototype.toJSON = function toJSON() { return isNaN(this) ? null : this.toISOString().replace(/\.(\d{3})Z$/, '.$1000Z'); };

const app = express();
app.set('trust proxy', true);
app.set('etag', false);
app.set('case sensitive routing', true);
app.set('query parser', (str) => lv.phpParseQuery(str));

app.use((req, res, next) => { req.__t0 = process.hrtime.bigint(); next(); });
app.use(lv.base);
app.use(lv.cors); // Laravel HandleCors + config/cors.php
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// Razorpay webhooks need the raw body for signature verification; modules read req.rawBody
// Request::isJson(): content type contains "/json" or "+json"; a UTF-8 BOM makes json_decode() fail (-> empty input)
app.use(express.json({ limit: '25mb', type: (req) => /[/+]json/i.test(req.headers['content-type'] || ''), verify: (req, res, buf) => { req.rawBody = buf; if (buf.length > 2 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) req.__bom = true; } }));
app.use((req, res, next) => { if (req.__bom) req.body = {}; next(); });
// PARITY-malformed-json: Laravel treats an unparsable JSON body as empty input (no 400)
app.use((err, req, res, next) => { if (err && err.type === 'entity.parse.failed') { req.body = {}; return next(); } return next(err); });
// application/x-www-form-urlencoded and the query string are parsed like PHP's parse_str() (last duplicate wins, a.b -> a_b ...)
app.use(express.text({ type: 'application/x-www-form-urlencoded', limit: '25mb' }));
app.use((req, res, next) => { if (typeof req.body === 'string') req.body = lv.phpParseQuery(req.body); next(); });
app.use(lv.multipartFields);
app.use(lv.methodOverride);
app.use(lv.options(methodsFor));
app.use((req, res, next) => (req.path.includes('//') ? notFound(req, res) : next()));
app.use(requestHelpers);

// Static files: php `storage:link` (public disk) and public/ folder
// Legacy URL shapes that Laravel served (and that WhatsApp invoice links still use): /storage/app/public/*, /public/storage/*
app.use('/storage/app/public', express.static(storage.PUBLIC_DIR));
app.use('/public/storage', express.static(storage.PUBLIC_DIR));
app.use('/storage', express.static(storage.PUBLIC_DIR));
app.use('/uploads', express.static(storage.UPLOADS_DIR));
app.use(express.static(require('path').join(storage.ROOT, 'public')));

// Laravel health route (bootstrap/app.php health: '/up') renders the health-up view
app.get('/up', (req, res) => {
  const html = require('fs').readFileSync(require('path').join(__dirname, 'resources', 'errors', 'health-up.html'), 'utf8').replace('@@MS@@', () => String(Math.round(Number(process.hrtime.bigint() - req.__t0) / 1e6)));
  res.status(200).set('Content-Type', 'text/html; charset=utf-8').end(html);
});
app.use('/api', require('./middleware/routeGuards'), routes.api);
// Compatibility aliases for clients requesting /worker/* or /customer/* without /api
app.use('/worker', (req, res, next) => {
  req.url = '/worker' + req.url;
  routes.api(req, res, next);
});
app.use('/customer', (req, res, next) => {
  req.url = '/customer' + req.url;
  routes.api(req, res, next);
});
app.use('/', routes.web);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
