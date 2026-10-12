// Port of App\Http\Controllers\BookingInvoiceController
const fs = require('fs');
const path = require('path');
const storage = require('../../utils/storage');
const config = require('../../config');
const { dayjs } = require('../../utils/time');
const { findOrFail } = require('../../utils/binding');
const WhatsAppCloudService = require('../../services/WhatsAppCloudService');
const { Booking } = require('../../models');
const { renderInvoicePdf, bookingForInvoice } = require('./invoicePdf');

module.exports = {
  async sendInvoice(req, res) {
    const bound = await findOrFail(Booking, req.params.booking);
    try {
      // 1) Payment check
      if (bound.payment_status !== Booking.PAYMENT_PAID) {
        return res.status(400).json({ success: false, message: 'Payment not completed' });
      }

      // 3) Generate PDF
      const booking = await bookingForInvoice(bound.id);
      const pdf = await renderInvoicePdf(booking);

      const filename = `invoice_booking_${booking.id}.pdf`;
      const rel = `invoices/${filename}`;

      // 4) Save in public disk (storage/app/public)
      const abs = path.join(storage.PUBLIC_DIR, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, pdf);

      // 5) Public URL of the saved PDF
      const invoiceUrl = `${config.appUrl}/storage/${rel}`;

      // 6) Send it over WhatsApp
      const sent = await WhatsAppCloudService.sendInvoiceTemplate(booking, invoiceUrl);
      if (!sent) return res.status(500).json({ success: false, message: 'WhatsApp sending failed' });

      // 7) Mark invoice as final
      await booking.update({ is_final: true, invoice_sent_at: dayjs().toDate() });

      return res.json({ success: true, invoice_url: invoiceUrl });
    } catch (e) {
      console.error('Invoice Generation Error', JSON.stringify({ booking_id: bound.id, error: e.message }));
      return res.status(500).json({ success: false, message: 'Invoice generation failed' });
    }
  },
};
