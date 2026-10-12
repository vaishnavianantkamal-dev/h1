// Invoice PDF (replaces dompdf render of resources/views/invoices/booking.blade.php) using pdfkit.
// Also exposes bookingForInvoice() which loads the Booking with service.category (the blade view reads them).
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { dayjs } = require('../../utils/time');
const storage = require('../../utils/storage');
const models = require('../../models');

const FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
];
const BOLD_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
  'C:\\Windows\\Fonts\\segoeuib.ttf',
];
const firstExisting = (list) => list.find((p) => fs.existsSync(p));

const num = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
const money = (v) => num(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => dayjs(d).format('DD MMM YYYY');

async function bookingForInvoice(bookingOrId) {
  const id = typeof bookingOrId === 'object' ? bookingOrId.id : bookingOrId;
  const { Booking, Service, ServiceCategory: Category } = models;
  const include = [];
  if (Service) {
    const catInclude = Category && Service.associations && Service.associations.category ? [{ model: Category, as: 'category' }] : [];
    include.push({ model: Service, as: 'service', include: catInclude });
  }
  return Booking.findByPk(id, { include });
}

// Returns a Promise<Buffer>
function renderInvoicePdf(booking) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const regPath = firstExisting(FONT_CANDIDATES);
    const boldPath = firstExisting(BOLD_CANDIDATES);
    let sym = 'Rs.';
    let reg = 'Helvetica';
    let bold = 'Helvetica-Bold';
    if (regPath) {
      try {
        doc.registerFont('Reg', regPath);
        reg = 'Reg';
        sym = '\u20B9';
        if (boldPath) { doc.registerFont('Bold', boldPath); bold = 'Bold'; } else bold = 'Reg';
      } catch (_) { reg = 'Helvetica'; bold = 'Helvetica-Bold'; sym = 'Rs.'; }
    }

    const L = 40; const R = 555; const W = R - L;
    const platformFee = num(booking.platform_fee);
    const travellingCharge = num(booking.travelling_charge);
    const subscriptionFee = num(booking.subscription_fee);
    const taxAmount = num(booking.tax_amount);
    const serviceCharge = 0;
    const itemTotal = num(booking.amount) - platformFee - travellingCharge - subscriptionFee - taxAmount;
    const subTotal = itemTotal + serviceCharge + platformFee + travellingCharge + subscriptionFee;

    // HEADER
    const logo = path.join(storage.ROOT, 'public', 'assets', 'logo.jpeg');
    if (fs.existsSync(logo)) { try { doc.image(logo, L, 40, { fit: [140, 60] }); } catch (_) { /* ignore */ } }
    doc.font(bold).fontSize(11).fillColor('#333').text('KPLONE & COMPANY PVT. LTD.', L, 40, { width: W, align: 'right' });
    doc.font(reg).fontSize(8.5).text(
      'CIN: U97000MH2025PTC461826\nShop No. 236, Second Floor, Roongta Futurex\nNear R.D Circle, Govind Nagar, Nashik \u2013 422008\nEmail: hobitkpl@gmail.com | Phone: +91 72619 59596',
      L, doc.y, { width: W, align: 'right' },
    );

    // TITLE
    let y = 115;
    doc.font(bold).fontSize(15).text('TAX INVOICE', L, y, { width: W, align: 'center' });
    y += 22;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(2).strokeColor('#2c3e50').stroke();
    y += 12;

    // META
    doc.font(bold).fontSize(10).text('Invoice No: ', L, y, { continued: true }).font(reg).text(String(booking.invoice_number ?? ''));
    doc.font(bold).text('Invoice Date: ', L, doc.y + 2, { continued: true }).font(reg).text(fmtDate(booking.paid_at || new Date()));
    doc.font(bold).text('Payment Mode: ', L, y, { width: W, align: 'right', continued: true }).font(reg).text('Online');
    y = doc.y + 18;

    // CUSTOMER
    const colW = W / 2 - 10;
    doc.font(bold).fontSize(10).text('To', L, y);
    doc.font(reg).text(`${booking.customer_name ?? ''}\n${booking.address ?? ''}\nPhone: ${booking.customer_phone ?? ''}`, L, doc.y, { width: colW });
    const leftEnd = doc.y;
    doc.font(bold).text('Booking Address', L + W / 2, y);
    doc.font(reg).text(
      `${booking.shipping_name ?? booking.customer_name ?? ''}\n${booking.shipping_address ?? booking.address ?? ''}\nPhone: ${booking.shipping_phone ?? booking.customer_phone ?? ''}`,
      L + W / 2, doc.y, { width: colW },
    );
    y = Math.max(leftEnd, doc.y) + 18;

    // ITEMS
    const cols = [{ x: L, w: 0.10 * W }, { x: L + 0.10 * W, w: 0.30 * W }, { x: L + 0.40 * W, w: 0.15 * W }, { x: L + 0.55 * W, w: 0.20 * W }, { x: L + 0.75 * W, w: 0.25 * W }];
    doc.rect(L, y, W, 24).fill('#2c3e50');
    doc.fillColor('#ffffff').font(bold).fontSize(9);
    ['Booking ID', 'Service Description', 'HSN / SAC', 'Date'].forEach((t, i) => doc.text(t, cols[i].x + 6, y + 8, { width: cols[i].w - 8 }));
    doc.text(`Amount (${sym})`, cols[4].x, y + 8, { width: cols[4].w - 6, align: 'right' });
    y += 30;
    doc.fillColor('#333').font(reg).fontSize(9.5);
    const service = booking.service || {};
    const svcName = service.name || '';
    const catName = service.category ? service.category.name : '';
    doc.text(`NSK-${booking.id}`, cols[0].x + 6, y, { width: cols[0].w - 8 });
    doc.text(svcName, cols[1].x + 6, y, { width: cols[1].w - 8 });
    if (catName) doc.fontSize(8).text(catName, cols[1].x + 6, doc.y, { width: cols[1].w - 8 }).fontSize(9.5);
    const rowEnd = doc.y;
    doc.text('9985', cols[2].x + 6, y, { width: cols[2].w - 8 });
    doc.text(booking.booking_date ? fmtDate(booking.booking_date) : '', cols[3].x + 6, y, { width: cols[3].w - 8 });
    doc.text(`${sym}${money(booking.amount)}`, cols[4].x, y, { width: cols[4].w - 6, align: 'right' });
    y = Math.max(rowEnd, y + 14) + 6;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor('#ddd').stroke();
    y += 10;

    // TOTALS
    const line = (label, amount, strong) => {
      doc.font(strong ? bold : reg).fontSize(strong ? 10.5 : 9.5).fillColor('#333');
      doc.text(label, L, y, { width: W * 0.85 - 8, align: 'right' });
      doc.text(`${sym}${money(amount)}`, L + W * 0.85, y, { width: W * 0.15, align: 'right' });
      y += strong ? 18 : 14;
    };
    line('Service Amount', itemTotal);
    line('Service Charges', serviceCharge);
    line('Platform Fees', platformFee);
    line('Travelling Charges', travellingCharge);
    if (subscriptionFee > 0) line('Subscription Fee', subscriptionFee);
    line('Sub Total', subTotal, true);
    line('Taxes & Charges (GST)', taxAmount);
    doc.moveTo(L, y).lineTo(R, y).lineWidth(2).strokeColor('#2c3e50').stroke();
    y += 6;
    line('Total Amount Paid', booking.amount, true);

    // SIGNATURE
    y += 30;
    doc.font(bold).fontSize(10).text('For KPLONE & COMPANY PVT. LTD.', L, y, { width: W, align: 'right' });
    doc.font(reg).text('Authorized Signatory', L, y + 40, { width: W, align: 'right' });

    doc.font(reg).fontSize(8.5).fillColor('#555').text(
      'This is a computer-generated invoice and does not require a physical signature.',
      L, y + 90, { width: W, align: 'center' },
    );
    doc.end();
  });
}

module.exports = { renderInvoicePdf, bookingForInvoice };
