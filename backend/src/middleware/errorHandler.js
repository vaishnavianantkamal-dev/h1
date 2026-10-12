// Laravel-shaped error responses (APP_DEBUG=false behaviour; set NODE_ENV!=production to see messages/traces in dev).
const { HttpError, ValidationError } = require('../utils/errors');
const config = require('../config');
const lv = require('./laravel');

const ORDER = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

// Which HTTP methods does some registered route accept for this path? (-> Laravel's 405 MethodNotAllowedHttpException)
function methodsFor(req) {
  if (req.path.includes('//')) return []; // Symfony never collapses duplicate slashes: no route matches
  const routes = require('../routes');
  const isApi = req.path.startsWith('/api/') || req.path === '/api';
  const router = isApi ? routes.api : routes.web;
  const path = isApi ? req.path.slice(4) || '/' : req.path;
  const found = new Set();
  (function walk(stack) {
    for (const l of stack) {
      if (l.route) {
        if (l.regexp.fast_slash || l.match(path)) Object.keys(l.route.methods).forEach((m) => { if (l.route.methods[m]) found.add(m.toUpperCase()); });
      } else if (l.handle && l.handle.stack) walk(l.handle.stack);
    }
  })(router.stack);
  if (found.has('GET')) found.add('HEAD');
  return ORDER.filter((m) => found.has(m));
}

const notFound = (req, res) => {
  const allowed = methodsFor(req);
  const uri = req.path.replace(/^\//, '') || '/';
  const json = lv.expectsJson(req);
  if (allowed.length && !allowed.includes(req.method)) {
    res.set('Allow', allowed.join(', '));
    if (!json) return lv.sendHtmlError(res, 405);
    return res.status(405).prettyJson({ message: `The ${req.method} method is not supported for route ${uri}. Supported methods: ${allowed.join(', ')}.` });
  }
  if (!json) return lv.sendHtmlError(res, 404);
  return res.status(404).prettyJson({ message: `The route ${uri} could not be found.` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const json = lv.expectsJson(req);
  // ValidationException: JSON 422 for expectsJson(), otherwise redirect()->back()
  if (err instanceof ValidationError) return json ? res.status(422).json({ message: err.message, errors: err.errors }) : lv.redirectBack(req, res);
  // abort(): rendered by the exception handler (pretty-printed JSON or HTML error page); custom bodies (extra) are plain response()->json
  if (err instanceof HttpError) {
    if (err.extra && Object.keys(err.extra).length) return res.status(err.status).json({ message: err.message, ...err.extra });
    return json ? res.status(err.status).prettyJson({ message: err.message }) : lv.sendHtmlError(res, err.status, err.message);
  }
  if (err.type === 'entity.too.large') return json ? res.status(413).prettyJson({ message: '' }) : lv.sendHtmlError(res, 413);
  if (err.name === 'MulterError') return res.status(422).json({ message: err.message, errors: { [err.field || 'file']: [err.message] } });

  // Database constraint violations -> friendly 4xx instead of a 500 (the PHP app leaked these as 500 errors).
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = (err.errors && err.errors[0] && err.errors[0].path) || Object.keys(err.fields || {})[0] || 'value';
    const label = String(field).replace(/^.*\./, '').replace(/_/g, ' ');
    const message = `The ${label} has already been taken.`;
    return res.status(422).json({ message, errors: { [String(field).replace(/^.*\./, '')]: [message] } });
  }
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const errno = err.parent && err.parent.errno;
    if (errno === 1451) return res.status(409).json({ message: 'This record is in use by other records and cannot be deleted.' });
    const message = 'One of the referenced records does not exist.';
    return res.status(422).json({ message, errors: { reference: [message] } });
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}
`, err);
  const body = { message: config.env === 'production' ? 'Server Error' : err.message };
  if (config.env !== 'production') { body.exception = err.name; body.trace = String(err.stack).split('\n').slice(0, 8); }
  if (!json && config.env === 'production') return lv.sendHtmlError(res, 500);
  return res.status(500).prettyJson(body);
};

module.exports = { notFound, errorHandler, methodsFor };
