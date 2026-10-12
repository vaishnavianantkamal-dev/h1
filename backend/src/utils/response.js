// Small helpers so controllers read like the Laravel originals.
const ok = (res, body = {}, status = 200) => res.status(status).json(body);
const fail = (res, message, status = 400, extra = {}) => res.status(status).json({ success: false, message, ...extra });

module.exports = { ok, fail };
