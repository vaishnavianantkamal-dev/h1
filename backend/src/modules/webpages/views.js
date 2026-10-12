// HTML renderings of the Blade views used by the web pages (resources/views/rating/*, resources/views/otp/*).
// The templates in src/resources/webpages/*.html are byte-for-byte captures of the real Blade output (including the HTML
// comments Blade leaves in the page), with @@TOKEN@@ (the @csrf token), @@BASE@@ (asset() root), @@MESSAGE@@ / @@ERRBLOCK@@ placeholders.
const fs = require('fs');
const path = require('path');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const cache = {};
const tpl = (name) => (cache[name] ||= fs.readFileSync(path.join(__dirname, '..', '..', 'resources', 'webpages', name), 'utf8'));
const fill = (name, vars) => tpl(name).replace(/@@(TOKEN|BASE|MESSAGE|ERRBLOCK)@@/g, (m, k) => (vars[k] === undefined ? '' : vars[k]));

// ctx = { token, base }  (base = scheme://host used by asset())
// rating/form.blade.php
const ratingForm = (ctx = {}) => fill('rating_form.html', { TOKEN: ctx.token, BASE: ctx.base });
// rating/success.blade.php
const ratingSuccess = (message) => fill('rating_success.html', { MESSAGE: esc(message) });
// otp/verify.blade.php  (error = first message of the flashed `otp` error, @error('otp'))
const otpVerify = (error, ctx = {}) => fill('otp_verify.html', {
  TOKEN: ctx.token,
  BASE: ctx.base,
  ERRBLOCK: error ? `        <p class="text-red-500 text-sm text-center">\n                    ${esc(error)}\n                </p>\n                    ` : '',
});
// otp/success.blade.php
const otpSuccess = (message) => fill('otp_success.html', { MESSAGE: esc(message) });

module.exports = { ratingForm, ratingSuccess, otpVerify, otpSuccess, esc };
