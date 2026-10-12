// Replacements for Laravel RateLimiter::for(...) named limiters + throttle:N,M (Illuminate\Routing\Middleware\ThrottleRequests).
// Fixed window starting at the first hit, only allowed requests count as hits (tooManyAttempts is checked before hit()).
//  - named limiter with ->response(): 429 body is the callback's JSON, NO rate-limit headers on it
//  - throttle:N,M: 429 {"message":"Too Many Attempts."} (exception handler, pretty-printed) + Retry-After / X-RateLimit-* headers
//  - allowed requests get X-RateLimit-Limit / X-RateLimit-Remaining
const buckets = new Map(); // key -> { hits, startMs, decayMs }

const sweep = () => { const now = Date.now(); for (const [k, b] of buckets) if (now >= b.startMs + b.decayMs) buckets.delete(k); };
setInterval(sweep, 60_000).unref();

function current(key, now) {
  const b = buckets.get(key);
  if (b && now >= b.startMs + b.decayMs) { buckets.delete(key); return null; }
  return b || null;
}

const make = (name, max, decaySeconds, keyFn, message) => (req, res, next) => {
  const raw = keyFn ? keyFn(req) : req.ip;
  const key = `${name}:${raw}`;
  const now = Date.now();
  let b = current(key, now);
  if (b && b.hits >= max) {
    if (message) return res.status(429).json({ success: false, message });
    const retryAfter = Math.max(0, Math.floor(b.startMs / 1000) + decaySeconds - Math.floor(now / 1000));
    res.set({
      'X-RateLimit-Limit': String(max), 'X-RateLimit-Remaining': '0',
      'Retry-After': String(retryAfter), 'X-RateLimit-Reset': String(Math.floor(now / 1000) + retryAfter),
    });
    return res.status(429).prettyJson({ message: 'Too Many Attempts.' });
  }
  if (!b) { b = { hits: 0, startMs: now, decayMs: decaySeconds * 1000 }; buckets.set(key, b); }
  b.hits += 1;
  res.set({ 'X-RateLimit-Limit': String(max), 'X-RateLimit-Remaining': String(Math.max(0, max - b.hits)) });
  return next();
};

const ip = (req) => req.ip;
// $request->input('phone') ?? $request->ip()   (body wins over query, '' was already converted to null)
const phoneOrIp = (req) => { const v = req.input ? req.input('phone', null) : (req.body && req.body.phone); if (v !== null && typeof v === 'object') throw new Error('Array to string conversion'); return v !== undefined && v !== null ? String(v) : req.ip; };

module.exports = {
  otp: make('otp', 3, 60, phoneOrIp, 'Too many OTP requests. Please wait 1 minute.'),
  booking: make('booking', 5, 60, (req) => String((req.user && req.user.id) || req.ip), 'Too many booking requests. Please slow down.'),
  pincodeCheck: make('pincode-check', 20, 60, ip, 'Too many pincode checks. Please wait.'),
  instantWorker: make('instant-worker', 30, 60, ip, 'Too many requests. Please wait.'),
  auth: make('auth', 10, 60, ip, 'Too many login attempts. Please wait 1 minute.'),
  // throttle:30,1  ->  throttle(30, 1)
  throttle: (max, minutes = 1) => make('throttle', max, minutes * 60, ip),
};
