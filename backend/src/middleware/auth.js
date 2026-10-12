// Sanctum-compatible auth ("auth:sanctum") + role middleware ("role:a,b").
// Tokens look like "<id>|<plain>"; DB stores sha256(plain) in personal_access_tokens.token, so tokens
// issued by the old Laravel app keep working after the switch.
const crypto = require('crypto');
const { PersonalAccessToken, User, Role, Permission } = require('../models');
const { dayjs } = require('../utils/time');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const TOKENABLE = 'App\\Models\\User';

// $user->createToken('name')->plainTextToken
async function createToken(user, name = 'api-token') {
  // Sanctum generateTokenString(): Str::random(40) . hash('crc32b', entropy)  (48 chars, [A-Za-z0-9])
  const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let entropy = '';
  for (let i = 0; i < 40; i += 1) entropy += ALNUM[crypto.randomInt(ALNUM.length)];
  let crc = ~0;
  for (let i = 0; i < entropy.length; i += 1) { crc ^= entropy.charCodeAt(i); for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  const plain = entropy + ((~crc) >>> 0).toString(16).padStart(8, '0');
  const row = await PersonalAccessToken.create({
    tokenable_type: TOKENABLE, tokenable_id: user.id, name, token: sha256(plain), abilities: '["*"]',
  });
  return `${row.id}|${plain}`;
}

// Illuminate Http Request::bearerToken(): last case-insensitive "Bearer " in the Authorization header, cut at the first ","
// (query-string tokens are NOT read by Sanctum's guard)
function bearer(req) {
  const h = req.headers.authorization || '';
  const pos = h.toLowerCase().lastIndexOf('bearer ');
  if (pos === -1) return null;
  const t = h.slice(pos + 7);
  return t.includes(',') ? t.slice(0, t.indexOf(',')) : t;
}

async function resolveUser(req) {
  const t = bearer(req);
  if (!t) return null;
  let row;
  if (t.includes('|')) {
    const i = t.indexOf('|');
    const id = t.slice(0, i); const plain = t.slice(i + 1); // explode('|', $token, 2)
    if (!/^[0-9]+$/.test(id)) return null;
    row = await PersonalAccessToken.findByPk(id);
    if (!row || row.token !== sha256(plain)) return null;
  } else {
    row = await PersonalAccessToken.findOne({ where: { token: sha256(t) } });
    if (!row) return null;
  }
  if (row.expires_at && dayjs(row.expires_at).isBefore(dayjs())) return null;
  const user = await User.findByPk(row.tokenable_id, {
    include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions', required: false }] }],
  });
  if (!user) return null;
  row.update({ last_used_at: new Date() }, { silent: true }).catch(() => {});
  req.accessToken = row;
  return user;
}

// auth:sanctum
const auth = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      // API clients always get a JSON 401 (Laravel answered non-JSON requests with a 500 HTML page here)
      const lv = require('./laravel');
      return (lv.expectsJson(req) || String(req.originalUrl).startsWith('/api')) ? res.status(401).json({ message: 'Unauthenticated.' }) : lv.sendHtmlError(res, 500);
    }
    req.user = user;
    next();
  } catch (e) { next(e); }
};

// For routes that call auth()->user() without requiring it (user may be null)
const optionalAuth = async (req, res, next) => {
  try { req.user = (await resolveUser(req)) || null; next(); } catch (e) { next(e); }
};

// role:super-admin,city-admin   (RoleMiddleware)
const role = (...slugs) => (req, res, next) => {
  const user = req.user;
  if (!user || !user.role) return res.status(401).json({ message: 'Unauthenticated' });
  if (!slugs.includes(user.role.slug)) return res.status(403).json({ message: 'Forbidden' });
  next();
};

module.exports = { auth, optionalAuth, role, createToken, sha256 };
