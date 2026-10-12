// Central access rules for /api. The Laravel app left many admin-only and sensitive routes with NO auth at all
// (anyone could create a super-admin via POST /register, change booking statuses, edit CMS/catalog/coupons, read bank
// details, trigger OTP / WhatsApp sends ...). Instead of editing 60 route files, every request passes this table first.
//
// Rules are matched top-to-bottom, first match wins. Anything not listed stays as the route file defines it
// (public app reads such as the catalog / CMS / banners / time-slots GETs, login + OTP, public forms, signed webhooks).
const crypto = require('crypto');
const config = require('../config');
const { auth, role } = require('./auth');

const CONTENT_ROLES = ['super-admin', 'city-admin', 'operation-head', 'staff'];
const OPS_ROLES = [...CONTENT_ROLES, 'co-ordinators'];

const content = [auth, role(...CONTENT_ROLES)];
const ops = [auth, role(...OPS_ROLES)];
const anyUser = [auth];
const accountAdmin = [auth, role('super-admin', 'city-admin')];

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// WhatsApp bot (server-to-server) - needs BOT_API_KEY (header x-api-key or Authorization: Bearer <key>)
const botKeyOk = (req) => {
  if (!config.botApiKey) return false;
  const h = req.get('x-api-key') || (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return !!h && safeEq(h, config.botApiKey);
};
const bot = [(req, res, next) => {
  if (!config.botApiKey) {
    if (config.env === 'production') return res.status(503).json({ message: 'Bot API key is not configured.' });
    return next(); // development convenience
  }
  return botKeyOk(req) ? next() : res.status(401).json({ message: 'Unauthorized' });
}];
const authOrBot = [(req, res, next) => (botKeyOk(req) ? next() : run(ops, req, res, next))];

// Cron endpoints: CRON_SECRET must be configured (an empty secret used to equal an empty header) and sent
const cron = [(req, res, next) => {
  const sent = req.get('x-cron-key') || req.get('x-cron-secret') || req.query.key;
  if (!config.cronSecret || !sent || !safeEq(sent, config.cronSecret)) return res.status(403).json({ message: 'Forbidden' });
  return next();
}];

// Debug/test routes only exist outside production
const testOnly = [(req, res, next) => (config.env === 'production' ? res.status(404).json({ message: 'The route could not be found.' }) : next())];

const RULES = [
  // ---- account creation: was fully public and accepted role_id (=> anyone could create a super-admin)
  ['POST', /^\/register$/, accountAdmin],

  // ---- debug routes
  [null, /^\/test-/, testOnly],

  // ---- cron triggers
  [null, /^\/booking\/sendstartotp$/, cron],
  ['POST', /^\/cron\/send-rating-links$/, cron],

  // ---- WhatsApp bot + bulk WhatsApp sends
  [null, /^\/bot(\/|$)/, bot],
  ['POST', /^\/whatsapp\/send(-booking)?$/, authOrBot],

  // ---- public form submissions stay open (matched before the GET-only admin rules below)
  ['POST', /^\/(enquiries|deep-cleaning-enquiries|service-requests|resident-surveys|maid-survey|delete-account-request|refer-and-earn|pincodes\/check)$/, null],

  // ---- admin-only reads of personal data
  ['GET', /^\/(enquiries|deep-cleaning-enquiries|service-requests|resident-surveys|maid-survey)(\/|$)/, content],
  ['PATCH', /^\/service-requests\/[^/]+\/status$/, content],
  ['GET', /^\/coupons(\/|$)/, content],
  ['GET', /^\/dashboard\/counts$/, ops],
  ['GET', /^\/worker\/bank-details_by_id\//, content],
  ['PUT', /^\/worker\/update_bank_by_id$/, content],
  ['GET', /^\/(coordinators|contractors)(\/|$)/, anyUser],
  ['GET', /^\/customer\/bookings\/[^/]+\/reschedule-history$/, anyUser],
  [null, /^\/admin\/(home-categories|marquees)(\/|$)/, content],

  // ---- booking operations that had no auth
  ['PATCH', /^\/bookings\/[^/]+\/status$/, ops],
  ['POST', /^\/bookings\/[^/]+\/send-invoice$/, ops],
  ['POST', /^\/booking\/(send-start-otp|send-close-otp|send-both-otp|generate-codes|end-service|send-otp|verify-otp|send-rating-link|send-payment-link|verifyotp\/[^/]+\/[^/]+|verifycode\/[^/]+\/[^/]+)$/, anyUser],
  ['GET', /^\/booking\/(active-code|timer)$/, anyUser],

  // ---- worker live location (worker app is logged in)
  ['POST', /^\/worker\/(location|live-location)$/, anyUser],

  // ---- events: customer-created ones need a login, everything else is admin
  ['POST', /^\/events\/store-for-customer$/, anyUser],

  // ---- catalog / location / content writes (reads stay public for the apps and website)
  ['POST', /^\/pincodes\/check$/, null],
  [['POST', 'PUT', 'PATCH', 'DELETE'], /^\/(service-categories|services|subscription-types|extra-time-fees|addons|cities|zones|serviceable-areas|banners|events|coupons|pincodes|cms)(\/|$)/, content],
];

function run(mws, req, res, next) {
  let i = 0;
  const step = (err) => {
    if (err) return next(err);
    const m = mws[i]; i += 1;
    return m ? m(req, res, step) : next();
  };
  step();
}

const guard = (req, res, next) => {
  for (const [methods, re, mws] of RULES) {
    if (methods && !(Array.isArray(methods) ? methods : [methods]).includes(req.method)) continue;
    if (!re.test(req.path)) continue;
    return mws ? run(mws, req, res, next) : next();
  }
  return next();
};

module.exports = guard;
module.exports.RULES = RULES;
