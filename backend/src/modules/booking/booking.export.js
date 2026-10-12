// Excel / CSV / PDF export (port of BookingController::exportExcel / exportCsv / exportPdf).
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { User, Op } = require('../../models');
const { dayjs } = require('../../utils/time');
const { coordinatorIdsOf, minMax, carbonParse } = require('./booking.helpers');
const { numberFormat } = require('./booking.views');

const ucfirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fmtDate = (d) => (d ? carbonParse(d).format('DD MMM YYYY') : null);

async function coordinatorMapFor(bookings) {
  const ids = [...new Set(bookings.flatMap((b) => coordinatorIdsOf(b)))].filter(Boolean);
  const map = {};
  if (ids.length) {
    const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'name'] });
    users.forEach((u) => { map[u.id] = u.name; });
  }
  return map;
}

function coordinatorNames(b, map) {
  const ids = coordinatorIdsOf(b);
  return ids.length ? ids.map((id) => map[id] ?? null).filter(Boolean).join(', ') : 'N/A';
}

const startEnd = (b) => {
  const services = b.services || [];
  return [minMax(services.map((s) => s.start_date), 'min'), minMax(services.map((s) => s.end_date), 'max')];
};

const stamp = () => dayjs().format('YYYYMMDD_HHmmss');

async function exportExcel(res, bookings) {
  const map = await coordinatorMapFor(bookings);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Worksheet');
  const headings = ['Sr No', 'Booking ID', 'Customer Name', 'Address', 'Slot Time', 'Date', 'Start Date', 'End Date', 'Coordinator', 'Payment Status', 'Amount'];
  ws.addRow(headings);

  bookings.forEach((b, index) => {
    const [startDate, endDate] = startEnd(b);
    ws.addRow([
      index + 1,
      b.id,
      b.customer?.name ?? 'N/A',
      b.address ?? 'N/A',
      b.time_slot ?? 'N/A',
      b.booking_date ? fmtDate(b.booking_date) : 'N/A',
      startDate ? fmtDate(startDate) : '-',
      endDate ? fmtDate(endDate) : '-',
      coordinatorNames(b, map),
      ucfirst(b.payment_status ?? 'N/A'),
      b.amount != null ? Number(b.amount) : 0,
    ]);
  });

  // styles(): header row bold white on solid 5070FE
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5070FE' } };
  });
  // ShouldAutoSize
  ws.columns.forEach((col, i) => {
    let max = headings[i].length;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = max + 2;
  });

  const buffer = await wb.xlsx.writeBuffer();
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename=bookings_${stamp()}.xlsx`,
  });
  res.send(Buffer.from(buffer));
}

// PHP fputcsv()
function csvLine(fields) {
  return (
    fields
      .map((f) => {
        const s = f === null || f === undefined ? '' : String(f);
        return /[,"\\\n\r\t ]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(',') + '\n'
  );
}

async function exportCsv(res, bookings) {
  const map = await coordinatorMapFor(bookings);

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="bookings_${stamp()}.csv"`,
    'Cache-Control': 'must-revalidate, post-check=0, pre-check=0',
    Expires: '0',
  });

  const columns = [
    'Sr No', 'Booking ID', 'Customer Name', 'Customer Phone',
    'Address', 'Assigned Worker', 'Coordinator',
    'Service', 'Category', 'Status', 'Payment Status',
    'Booking Date', 'Slot Time', 'Start Date', 'End Date', 'Amount', 'Created At',
  ];

  let out = csvLine(columns);
  let srNo = 0;
  for (const b of bookings) {
    srNo++;
    const [startDate, endDate] = startEnd(b);
    out += csvLine([
      srNo,
      b.id,
      b.customer?.name ?? 'N/A',
      b.customer?.phone ?? 'N/A',
      b.address ?? 'N/A',
      b.worker?.name ?? 'N/A',
      coordinatorNames(b, map),
      b.service?.name ?? 'N/A',
      b.service?.category?.name ?? 'N/A',
      ucfirst(b.status),
      ucfirst(b.payment_status ?? 'N/A'),
      b.booking_date ? fmtDate(b.booking_date) : 'N/A',
      b.time_slot ?? 'N/A',
      startDate ? fmtDate(startDate) : '-',
      endDate ? fmtDate(endDate) : '-',
      b.amount != null ? Number(b.amount).toFixed(2) : 0, // decimal:2 cast
      b.created_at ? dayjs(b.created_at).format('DD MMM YYYY, hh:mm A') : 'N/A',
    ]);
  }
  res.status(200).send(out);
}

async function exportPdf(res, bookings) {
  const map = await coordinatorMapFor(bookings);

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  const headers = ['Sr No', 'Booking ID', 'Customer Name', 'Address', 'Slot Time', 'Date', 'Start Date', 'End Date', 'Coordinator', 'Payment Status', 'Amount'];
  const widths = [30, 45, 90, 150, 70, 60, 60, 60, 90, 55, 50];
  const left = 20;
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = (doc.page.width - 40) / total;
  const w = widths.map((x) => x * scale);

  doc.fillColor('#5070FE').font('Helvetica-Bold').fontSize(16).text('Bookings Report', { align: 'center' });
  doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(`Generated on ${dayjs().format('DD MMM YYYY, hh:mm A')}`, { align: 'center' });
  doc.moveDown();

  const drawRow = (cells, y, { head = false, shade = false } = {}) => {
    const h = 18;
    if (head) doc.rect(left, y, doc.page.width - 40, h).fill('#5070FE');
    else if (shade) doc.rect(left, y, doc.page.width - 40, h).fill('#f9fafb');
    doc.fillColor(head ? '#ffffff' : '#000000').font(head ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
    let x = left;
    cells.forEach((c, i) => {
      doc.text(String(c ?? ''), x + 4, y + 5, { width: w[i] - 8, height: h - 6, ellipsis: true, lineBreak: false });
      x += w[i];
    });
    if (!head) doc.moveTo(left, y + h).lineTo(doc.page.width - 20, y + h).strokeColor('#e5e7eb').stroke();
    return y + h;
  };

  let y = drawRow(headers, doc.y, { head: true });
  if (!bookings.length) {
    doc.fillColor('#6b7280').fontSize(9).text('No bookings found.', left, y + 10, { align: 'center' });
  }
  bookings.forEach((b, i) => {
    if (y > doc.page.height - 40) {
      doc.addPage();
      y = drawRow(headers, 20, { head: true });
    }
    const [startDate, endDate] = startEnd(b);
    y = drawRow(
      [
        i + 1,
        b.id,
        b.customer?.name ?? 'N/A',
        b.address ?? 'N/A',
        b.time_slot ?? 'N/A',
        b.booking_date ? fmtDate(b.booking_date) : 'N/A',
        startDate ? fmtDate(startDate) : '-',
        endDate ? fmtDate(endDate) : '-',
        coordinatorNames(b, map),
        ucfirst(b.payment_status ?? 'N/A'),
        numberFormat(b.amount ?? 0, 2),
      ],
      y,
      { shade: i % 2 === 1 }
    );
  });

  doc.end();
  await done;

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=bookings_${stamp()}.pdf`,
    'Access-Control-Allow-Origin': 'https://admin.hobit.club',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.send(Buffer.concat(chunks));
}

module.exports = { exportExcel, exportCsv, exportPdf, coordinatorMapFor };
