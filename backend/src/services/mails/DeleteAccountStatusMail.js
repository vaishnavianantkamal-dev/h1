// Port of app/Mail/DeleteAccountStatusMail.php + emails/delete-account-status.blade.php
// Usage: await send(deleteAccountRequest, to)   (to defaults to request.email)
const config = require('../../config');
const { sendMail, esc } = require('../MailService');
const { layout } = require('./_layout');

function build(request) {
  const appName = config.appName;
  const approved = request.status === 'approved'; // DeleteAccountRequest::STATUS_APPROVED
  const word = approved ? 'approved' : 'rejected';

  const html = layout({
    title: 'Account Deletion Request ' + (approved ? 'Approved' : 'Rejected'),
    header: `<h1>${esc(appName)}</h1>
    <p>Account deletion request ${word}</p>`,
    body: `<p>Hi ${esc(request.full_name)},</p>

    <p>Your account deletion request has been <strong>${word}</strong>.</p>

    <p>
        ${approved
          ? `<span class="status-badge status-approved">Approved</span><br>
            Your account and associated data will be removed as per our process. If you have any questions, please contact support.`
          : `<span class="status-badge status-rejected">Rejected</span><br>
            Your request to delete your account could not be processed at this time.`}
    </p>

    ${request.admin_reason ? `<div class="reason-box">
        <strong>Note from our team:</strong><br>
        ${esc(request.admin_reason)}
    </div>` : ''}

    <p>If you have any questions, reply to this email or contact our support team.</p>`,
    footer: `&copy; ${new Date().getFullYear()} ${esc(appName)}. All rights reserved.`,
  });
  return { subject: `Account Deletion Request ${approved ? 'Approved' : 'Rejected'} – ${appName}`, html };
}

async function send(request, to) {
  const { subject, html } = build(request);
  return sendMail({ to: to || request.email, subject, html, replyTo: config.mail.fromAddress });
}

module.exports = { send, build };
