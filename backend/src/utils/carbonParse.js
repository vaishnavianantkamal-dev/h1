// Emulation of the PHP DateTime::createFromFormat() behaviour used by the cron code for time slots
// ('g:i A' and 'H:i'), including its quirks: hour 1-2 digits, minutes exactly 2 digits (overflow allowed, e.g.
// "12:75 AM" = 01:15), case-insensitive AM/PM (also a.m./p.m.), zero or more spaces before the meridian.
// Both return minutes since midnight (may exceed 1440 on overflow) or null when PHP would throw.
const G_RE = /^(\d{1,2}):(\d{2})[ \t\u00a0]*([ap])(?:m|\.m\.)$/i;
const H_RE = /^(\d{1,2}):(\d{2})$/;

function parseG(s) {
  const m = G_RE.exec(String(s ?? ''));
  if (!m) return null;
  let h = parseInt(m[1], 10);
  if (h > 12) return null;
  const pm = m[3].toLowerCase() === 'p';
  if (pm) { if (h !== 12) h += 12; } else if (h === 12) h = 0;
  return h * 60 + parseInt(m[2], 10);
}

function parseH(s) {
  const m = H_RE.exec(String(s ?? ''));
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

module.exports = { parseG, parseH };
