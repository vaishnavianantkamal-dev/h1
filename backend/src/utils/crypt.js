// Port of Illuminate\Support\Facades\Crypt (encryptString / decryptString), AES-256-CBC, compatible with
// values written by Laravel using the same APP_KEY.
const crypto = require('crypto');
const config = require('../config');

function key() {
  let k = config.appKey || '';
  if (k.startsWith('base64:')) return Buffer.from(k.slice(7), 'base64');
  return Buffer.from(k);
}

const hmac = (iv, value) => crypto.createHmac('sha256', key()).update(iv + value).digest('hex');

function encryptString(plain) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key(), iv);
  const value = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]).toString('base64');
  const ivB64 = iv.toString('base64');
  const json = JSON.stringify({ iv: ivB64, value, mac: hmac(ivB64, value), tag: '' });
  return Buffer.from(json).toString('base64');
}

// Throws on invalid payload (like DecryptException)
function decryptString(payload) {
  let p;
  try { p = JSON.parse(Buffer.from(String(payload), 'base64').toString('utf8')); } catch (e) { p = null; }
  if (!p || !p.iv || !p.value || !p.mac) throw new Error('The payload is invalid.');
  const expected = hmac(p.iv, p.value);
  const a = Buffer.from(expected), b = Buffer.from(String(p.mac));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('The MAC is invalid.');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key(), Buffer.from(p.iv, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(p.value, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encryptString, decryptString };
