// Port of app/Mail/DeleteAccountRequestReceivedMail.php + emails/delete-account-request-received.blade.php
// Usage: await send(deleteAccountRequest, to)   (to defaults to request.email)
const config = require('../../config');
const { sendMail, esc } = require('../MailService');
const { layout } = require('./_layout');

function build(request) {
  const appName = config.appName;
  const html = layout({
    title: 'Account Deletion Request Received',
    header: `<h1>${esc(appName)}</h1>
    <p>Account deletion request received</p>`,
    body: `<p>Hi ${esc(request.full_name)},</p>

    <p>We have received your request to delete your account.</p>

    <div class="highlight">
        <strong>Request details</strong><br>
        Email: ${esc(request.email)}<br>
        ${request.phone ? `Phone: ${esc(request.phone)}<br>\n        ` : ''}Request ID: #${esc(request.id)}
    </div>

    <p>Our team will review your request and get back to you soon. You will receive another email once the request is processed (approved or rejected).</p>

    <p>If you did not submit this request, please contact our support team.</p>`,
    footer: `&copy; ${new Date().getFullYear()} ${esc(appName)}. All rights reserved.`,
  });
  return { subject: `Account Deletion Request Received – ${appName}`, html };
}

async function send(request, to) {
  const { subject, html } = build(request);
  return sendMail({ to: to || request.email, subject, html, replyTo: config.mail.fromAddress });
}

module.exports = { send, build };
