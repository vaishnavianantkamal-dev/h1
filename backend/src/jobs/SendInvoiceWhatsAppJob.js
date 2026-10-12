// Port of App\Jobs\SendInvoiceWhatsAppJob
//   queue.dispatch('SendInvoiceWhatsAppJob', { bookingId })   /   queue.dispatchNow(...) (== dispatchSync)
const fs = require('fs');
const path = require('path');
const queue = require('./queue');
const storage = require('../utils/storage');
const { dayjs } = require('../utils/time');
const { assetUrl } = require('../utils/storage');
const WhatsAppCloudService = require('../services/WhatsAppCloudService');
const { Booking } = require('../models');
const { renderInvoicePdf, bookingForInvoice } = require('../modules/payments/invoicePdf');

async function handle(payload) {
  const bookingId = typeof payload === 'object' && payload !== null ? (payload.bookingId ?? payload.booking_id) : payload;
  const found = await Booking.findByPk(bookingId);

  if (!found || found.invoice_sent_at) return;

  const booking = await bookingForInvoice(found.id);

  // Generate PDF
  const pdf = await renderInvoicePdf(booking);

  const filename = `invoice_booking_${booking.id}.pdf`;
  const rel = `invoices/${filename}`;
  const abs = path.join(storage.PUBLIC_DIR, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, pdf);

  const invoiceUrl = assetUrl(`storage/${rel}`);

  // Send template message
  await WhatsAppCloudService.sendInvoiceTemplate(booking, invoiceUrl);

  // Mark sent
  await booking.update({ invoice_sent_at: dayjs().toDate(), is_final: true });
}

queue.register('SendInvoiceWhatsAppJob', handle);

module.exports = { handle };
