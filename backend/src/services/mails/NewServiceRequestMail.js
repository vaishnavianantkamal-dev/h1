// Hobit1: admin notification for a new website service booking request.
// Usage: await send(request, to)
const dayjs = require('dayjs');
const { sendMail, esc } = require('../MailService');

const PAYMENT_LABELS = { cash: 'Cash after service', upi: 'UPI after service', online: 'Online payment' };
const TIME_LABELS = { morning: 'Morning (8 AM – 12 PM)', afternoon: 'Afternoon (12 PM – 4 PM)', evening: 'Evening (4 PM – 8 PM)' };

function build(r) {
  const rows = [
    ['Service', `${r.service_name} (${r.category}${r.sub_category ? ` › ${r.sub_category}` : ''})`],
    ['Name', r.name],
    ['Phone', r.phone],
    ['Email', r.email],
    ['Address', r.address],
    ['Locality', r.locality],
    ['Landmark', r.landmark],
    ['City / Pincode', `${r.city} – ${r.pincode}`],
    ['Map location', r.latitude != null && r.longitude != null ? `https://maps.google.com/?q=${r.latitude},${r.longitude}` : null],
    ['Preferred date', r.preferred_date ? dayjs(r.preferred_date).format('DD MMM YYYY') : null],
    ['Preferred time', TIME_LABELS[r.preferred_time] || r.preferred_time],
    ['Payment', PAYMENT_LABELS[r.payment_method] || r.payment_method],
    ['Notes', r.notes],
  ].filter(([, v]) => v);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>New Service Request</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <table width="600" align="center" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <tr><td style="background-color: #3d8bff; padding: 24px 30px;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px;">New Service Request #${esc(r.id)}</h1>
    </td></tr>
    <tr><td style="padding: 20px 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows.map(([k, v]) => `<tr>
          <td style="padding: 8px 0; font-size: 12px; color: #999999; text-transform: uppercase; width: 150px; vertical-align: top;">${esc(k)}</td>
          <td style="padding: 8px 0; font-size: 15px; color: #222222;">${esc(v)}</td>
        </tr>`).join('')}
      </table>
    </td></tr>
    <tr><td style="padding: 16px 30px; background-color: #f9f9f9; font-size: 12px; color: #999999;">
      Received on ${dayjs(r.created_at).format('DD MMM YYYY, hh:mm A')} · Hobit1
    </td></tr>
  </table>
</body></html>`;

  return { subject: `New Service Request: ${r.service_name} – ${r.name}`, html };
}

async function send(request, to) {
  const { subject, html } = build(request);
  return sendMail({ to, subject, html });
}

module.exports = { send, build };
