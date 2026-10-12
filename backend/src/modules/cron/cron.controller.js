// Inline closures from the top of routes/api.php
const config = require('../../config');
const { abort } = require('../../utils/errors');
const { findOrFail } = require('../../utils/binding');
const { Booking, Service } = require('../../models');
const OtpService = require('../../services/OtpService');
const WhatsAppCloudService = require('../../services/WhatsAppCloudService');
const MailService = require('../../services/MailService');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// emails/delete-account-request-received.blade.php (extends emails.layout)
function deleteAccountReceivedHtml(request) {
  const appName = 'Hobit';
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deletion Request Received</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; }
        .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
        .card { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: #fff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
        .header p { margin: 8px 0 0; opacity: 0.95; font-size: 14px; }
        .body { padding: 28px 24px; color: #374151; font-size: 15px; line-height: 1.6; }
        .body p { margin: 0 0 14px; }
        .body p:last-child { margin-bottom: 0; }
        .highlight { background: #f0fdfa; border-left: 4px solid #0d9488; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 18px 0; }
        .footer { padding: 20px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <div class="header">
                <h1>${appName}</h1>
                <p>Account deletion request received</p>
            </div>
            <div class="body">
                <p>Hi ${esc(request.full_name)},</p>
                <p>We have received your request to delete your account.</p>
                <div class="highlight">
                    <strong>Request details</strong><br>
                    Email: ${esc(request.email)}<br>
                    ${request.phone ? `Phone: ${esc(request.phone)}<br>` : ''}
                    Request ID: #${esc(request.id)}
                </div>
                <p>Our team will review your request and get back to you soon. You will receive another email once the request is processed (approved or rejected).</p>
                <p>If you did not submit this request, please contact our support team.</p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>`;
}

module.exports = {
  // GET /test-delete-mail
  async testDeleteMail(req, res) {
    const fake = { id: 1, email: 'your-test-email@example.com', full_name: 'Test User', phone: '9999999999', status: 'pending' };
    await MailService.sendMail({
      to: fake.email,
      subject: `Account Deletion Request Received – ${'Hobit'}`,
      html: deleteAccountReceivedHtml(fake),
    });
    return res.json({ ok: true });
  },

  // POST /test-instant-reminder/{booking}
  async testInstantReminder(req, res) {
    const booking = await findOrFail(Booking, req.params.booking, { include: [{ model: Service, as: 'service' }] });

    // PHP: $booking->service->category_id == env('INSTANT_CATEGORY_ID') (raw env(), no default: unset -> null -> never equal)
    const envInstant = process.env.INSTANT_CATEGORY_ID;
    const isInstant = envInstant !== undefined && booking.service.category_id == envInstant;

    if (!isInstant) {
      return res.json({ success: false, message: 'Not an instant booking' });
    }

    // PHP passes a 3rd (button) argument that sendWhatsapp() ignores - plain text message is sent.
    await OtpService.sendWhatsapp(
      booking.customer_phone,
      '⏰ TEST REMINDER: Aapki service 10 minutes mein khatam hone wali hai.\n\nExtend karne ke liye button dabayein.'
    );

    return res.json({ success: true, message: 'Reminder sent successfully' });
  },

  // GET /cron/instant?key=...
  async cronInstant(req, res) {
    if (req.query.key !== config.cronSecret) {
      abort(403);
    }
    await require('../../commands/instantBookingCron').run();
    return res.json({ status: 'Instant cron executed' });
  },

  // GET /test-whatsapp  (PHP closure returns null -> empty 200 response)
  async testWhatsapp(req, res) {
    await WhatsAppCloudService.sendText('918484944381', 'Hello 👋 Test message from Hobit WhatsApp Cloud API');
    return res.status(200).send('');
  },
};
