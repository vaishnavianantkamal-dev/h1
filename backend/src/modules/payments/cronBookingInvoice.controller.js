// Port of App\Http\Controllers\CronBookingInvoiceController
// The X-CRON-KEY check lives in the route (routes/api.php closure) - see payments.routes.js.
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const storage = require('../../utils/storage');
const { assetUrl } = require('../../utils/storage');
const { dayjs } = require('../../utils/time');
const WhatsAppCloudService = require('../../services/WhatsAppCloudService');
const { Booking } = require('../../models');
const { renderInvoicePdf, bookingForInvoice } = require('./invoicePdf');

// Returns the JSON payload (also usable as an express handler via the exported `handler`)
async function run() {
  const bookings = await Booking.findAll({
    where: { payment_status: Booking.PAYMENT_PAID, invoice_sent_at: { [Op.is]: null } },
    limit: 20,
  });

  for (const b of bookings) {
    try {
      const booking = await bookingForInvoice(b.id);
      const rel = `invoices/invoice_booking_${booking.id}.pdf`;
      const abs = path.join(storage.PUBLIC_DIR, rel);

      if (!fs.existsSync(abs)) {
        const pdf = await renderInvoicePdf(booking);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, pdf);
      }

      const invoiceUrl = assetUrl(`public/storage/${rel}`);
      const sent = await WhatsAppCloudService.sendInvoiceTemplate(booking, invoiceUrl);

      if (sent) await booking.update({ invoice_sent_at: dayjs().toDate() });
    } catch (e) {
      console.error('Cron invoice failed', JSON.stringify({ booking_id: b.id, error: e.message }));
    }
  }

  return { processed: bookings.length };
}

module.exports.run = run;
module.exports.handler = async (req, res) => res.json(await run());
