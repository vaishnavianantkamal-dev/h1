// Replaces Laravel Mail::to()->send(). nodemailer transport built lazily from config.mail; fails soft.
const config = require('../config');

let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (!config.mail.host) {
    transporter = null;
    return null;
  }
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
  return transporter;
}

/** Minimal Blade {{ }} escaping. */
const esc = (v) =>
  String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

/**
 * sendMail({ to, subject, html, text, attachments, from, replyTo })
 * Returns true on success, false on failure (never throws).
 */
async function sendMail({ to, subject, html, text, attachments, from, replyTo } = {}) {
  try {
    const t = getTransporter();
    if (!t) {
      console.error('MailService: MAIL_HOST not configured - mail not sent', { to, subject });
      return false;
    }
    await t.sendMail({
      from: from || `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
      to,
      subject,
      html,
      text,
      attachments,
      replyTo,
    });
    return true;
  } catch (e) {
    console.error('MailService: send failed', { to, subject, error: e.message });
    return false;
  }
}

module.exports = { sendMail, esc };
