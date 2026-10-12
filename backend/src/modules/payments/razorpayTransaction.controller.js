// Port of App\Http\Controllers\Transaction\RazorpayTransactionController
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Op, fn, col, literal } = require('sequelize');
const { dayjs } = require('../../utils/time');
const validate = require('../../utils/validate');
const { getScopedCityId } = require('../../utils/cityScoped');
const { Transaction, User } = require('../../models');
const php = require('./phpish');

const HEADINGS = ['Sr No', 'Payment ID', 'Order ID', 'User Name', 'Mobile', 'Email', 'Amount', 'Refunded', 'Currency', 'Payment Type', 'Status', 'Description', 'Paid At'];

// Shared filters: city scope (via related user) + date + status. Returns { where, include }.
function buildFilters(req) {
  const cityId = getScopedCityId(req);
  const where = {};
  const include = [{ model: User, as: 'user', required: !!cityId, ...(cityId ? { where: { city_id: cityId } } : {}) }];

  if (req.filled('date')) {
    const date = php.carbonParse(req.input('date'));
    where.paid_at = { [Op.between]: [date.startOf('day').toDate(), date.endOf('day').toDate()] };
  } else if (req.filled('from') || req.filled('to')) {
    const from = php.carbonParse(req.input('from') ?? '2014-01-01').startOf('day');
    const to = php.carbonParse(req.input('to') ?? dayjs().format('YYYY-MM-DD HH:mm:ss')).endOf('day');
    where.paid_at = { [Op.between]: [from.toDate(), to.toDate()] };
  }
  // No filter = all records

  if (req.filled('status')) where.status = req.input('status');
  return { where, include };
}

const fmtExportDate = (d) => (d ? dayjs(d).format('DD MMM YYYY, hh:mm A') : 'N/A');
const nz = (v, d) => (v === undefined || v === null ? d : v);
const ucfirst = (s) => { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); };

const exportRow = (t, i) => [
  i + 1,
  nz(t.payment_id, 'N/A'),
  nz(t.order_id, 'N/A'),
  (t.user && t.user.name) || 'Unknown',
  nz(t.contact, 'N/A'),
  nz(t.email, 'N/A'),
  nz(t.toJSON().amount, 0), // Eloquent: raw decimal string "30.00"
  nz(t.toJSON().amount_refunded, 0),
  String(nz(t.currency, 'INR')).toUpperCase(),
  nz(t.method, 'N/A'),
  ucfirst(nz(t.status, 'N/A')),
  nz(t.description, 'N/A'),
  fmtExportDate(t.paid_at),
];

const stamp = () => dayjs().format('YYYYMMDD_HHmmss');

// PHP fputcsv(): enclose when the field contains delimiter, enclosure, escape char, \n, \r, \t or space; double quotes unless escaped by "\\"
const csvCell = (v) => {
  const s = String(v);
  if (!/[",\\\n\r\t ]/.test(s)) return s;
  let out = '"';
  let escaped = false;
  for (const ch of s) {
    if (ch === '\\') escaped = true;
    else if (!escaped && ch === '"') out += '"';
    else escaped = false;
    out += ch;
  }
  return out + '"';
};

// PhpSpreadsheet (Maatwebsite) default value binder: numeric-looking strings become numeric cells, "=..." becomes a formula
function bindValue(v) {
  if (typeof v !== 'string') return v;
  if (v === '') return null; // empty string: PhpSpreadsheet writes no cell
  if (v[0] === '=' && v.length > 1) return { formula: v.slice(1) };
  if (/^[+-]?(\d+\.?\d*|\.\d+|\d+(\.\d+)?[eE][+-]?\d+)$/.test(v)) {
    const tv = v.replace(/^[+-]+/, '');
    if (tv.length > 1 && tv[0] === '0' && tv[1] !== '.') return v;
    if (!v.includes('.') && Number(v) > 9223372036854775807) return v;
    return Number(v);
  }
  return v;
}

// ShouldAutoSize: PhpSpreadsheet approximate Calibri-11 width: (int)(8.26 * chars) px -> (px + 8) * 9.140625 / 64
function autoWidth(text) {
  let px = 0;
  for (const line of String(text).split('\n')) px = Math.max(px, Math.trunc(8.26 * [...line].length));
  return Math.round(((px + 8) * 9.140625 / 64) * 1000) / 1000;
}

async function exportExcel(res, transactions) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Worksheet');
  const rows = [HEADINGS, ...transactions.map((t, i) => exportRow(t, i))];
  rows.forEach((r, i) => ws.addRow(i === 0 ? r : r.map(bindValue)));
  const head = ws.getRow(1);
  head.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5070FE' } };
  HEADINGS.forEach((_, ci) => {
    let w = 0;
    rows.forEach((r, ri) => { let v = ri === 0 ? r[ci] : bindValue(r[ci]); if (v && typeof v === 'object') v = '=' + v.formula; w = Math.max(w, autoWidth(v === null || v === undefined ? '' : v)); });
    ws.getColumn(ci + 1).width = w;
  });
  const buf = await wb.xlsx.writeBuffer();
  res.set({
    'Cache-Control': 'public',
    'Last-Modified': new Date().toUTCString(),
    'Content-Disposition': `attachment; filename=transactions_${stamp()}.xlsx`,
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Accept-Ranges': 'bytes',
  });
  return res.send(Buffer.from(buf));
}

function exportCsv(res, transactions) {
  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="transactions_${stamp()}.csv"`,
    'Cache-Control': 'must-revalidate, post-check=0, pre-check=0, private',
    Expires: '0',
  });
  const lines = [HEADINGS.map(csvCell).join(',')];
  transactions.forEach((t, i) => lines.push(exportRow(t, i).map(csvCell).join(',')));
  return res.status(200).send(`${lines.join('\n')}\n`);
}

function exportPdf(res, transactions) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', resolve));

  doc.fontSize(14).fillColor('#5070FE').text('Transactions Report', { align: 'center' });
  doc.moveDown(0.3).fontSize(8).fillColor('#6b7280').text(`Generated on ${dayjs().format('DD MMM YYYY, hh:mm A')}`, { align: 'center' });
  doc.moveDown(0.8);

  const cols = ['Sr No', 'Payment ID', 'Order ID', 'User Name', 'Mobile', 'Email', 'Amount', 'Refunded', 'Currency', 'Payment Type', 'Status', 'Paid At'];
  const widths = [30, 90, 90, 80, 60, 110, 45, 45, 40, 55, 50, 85];
  const x0 = 20;
  const drawRow = (cells, y, header) => {
    let x = x0;
    if (header) doc.rect(x0, y - 3, widths.reduce((a, b) => a + b, 0), 14).fill('#5070FE');
    doc.fillColor(header ? '#ffffff' : '#000000').fontSize(7);
    cells.forEach((c, i) => { doc.text(String(c), x + 2, y, { width: widths[i] - 4, height: 10, ellipsis: true, lineBreak: false }); x += widths[i]; });
  };
  let y = doc.y;
  drawRow(cols, y, true);
  y += 15;
  if (!transactions.length) {
    doc.fillColor('#6b7280').text('No transactions found.', x0, y + 10);
  }
  transactions.forEach((t, i) => {
    if (y > 560) { doc.addPage(); y = 25; drawRow(cols, y, true); y += 15; }
    const r = exportRow(t, i);
    const cells = [
      r[0], r[1], r[2], r[3], r[4], r[5],
      Number(t.amount || 0).toFixed(2), Number(t.amount_refunded || 0).toFixed(2), r[8], r[9], r[10], r[12],
    ];
    drawRow(cells, y, false);
    y += 13;
  });
  doc.end();
  return done.then(() => {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=transactions_${stamp()}.pdf`,
      'Cache-Control': 'no-cache, private',
      'Access-Control-Allow-Origin': 'https://admin.hobit.club',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.send(Buffer.concat(chunks));
  });
}

module.exports = {
  async index(req, res) {
    const { where, include } = buildFilters(req);

    // SUMMARY - single SQL query
    const summary = await Transaction.findOne({
      where,
      include: include.map((i) => ({ ...i, attributes: [] })),
      attributes: [
        [literal("SUM(CASE WHEN `Transaction`.`status` = 'captured' THEN 1 ELSE 0 END)"), 'total_transactions'],
        [literal("SUM(CASE WHEN `Transaction`.`status` = 'captured' THEN `Transaction`.`amount` ELSE 0 END)"), 'total_income'],
        [literal('SUM(COALESCE(`Transaction`.`amount_refunded`, 0))'), 'total_refunds'],
      ],
      raw: true,
    });

    const totalTransactions = parseInt((summary && summary.total_transactions) || 0, 10);
    const totalIncome = parseFloat((summary && summary.total_income) || 0);
    const totalRefunds = parseFloat((summary && summary.total_refunds) || 0);
    const netBalance = totalIncome - totalRefunds;

    // PAGINATION
    const perPage = 10;
    // Paginator::resolveCurrentPage(): filter_var($page, FILTER_VALIDATE_INT) and >= 1, else 1
    const rawPage = req.query.page;
    const page = typeof rawPage === 'string' && /^\s*[+-]?(0|[1-9]\d*)\s*$/.test(rawPage) && parseInt(rawPage, 10) >= 1 ? parseInt(rawPage, 10) : 1;
    const total = await Transaction.count({ where, include, distinct: true });
    const rows = await Transaction.findAll({ where, include, order: [['paid_at', 'DESC']], limit: perPage, offset: (page - 1) * perPage });
    const lastPage = Math.max(Math.ceil(total / perPage), 1);

    const data = rows.map((t) => ({
      payment_id: t.payment_id,
      amount: t.toJSON().amount,
      currency: t.currency,
      payment_type: t.method,
      status: t.status,
      paid_at: t.paid_at ? dayjs(t.paid_at).format('DD-MM-YYYY HH:mm:ss') : '-',
      mobile: t.contact,
      user_id: t.user ? t.user.id : null,
      user_name: (t.user && t.user.name) || 'Unknown',
    }));

    const hasDate = req.filled('date');
    const round2 = (n) => Math.round(n * 100) / 100;

    return res.json({
      success: true,
      summary: {
        total_transactions: totalTransactions,
        total_income: round2(totalIncome),
        total_refunds: round2(totalRefunds),
        net_balance: round2(netBalance),
      },
      applied_filters: {
        date: hasDate ? req.input('date') : null,
        from: !hasDate ? req.input('from') : null,
        to: !hasDate ? req.input('to') : null,
      },
      meta: {
        current_page: page,
        per_page: perPage,
        total,
        total_pages: lastPage,
        last_page: lastPage,
        count: rows.length,
        from: rows.length ? (page - 1) * perPage + 1 : null,
        to: rows.length ? (page - 1) * perPage + rows.length : null,
        has_more: page < lastPage,
      },
      data,
    });
  },

  // EXPORT - CSV (default), Excel, PDF
  async export(req, res) {
    await validate(req, {
      date: 'nullable|date',
      from: 'nullable|date',
      to: 'nullable|date',
      status: 'nullable|string',
      format: 'nullable|in:csv,excel,pdf',
    });

    const { where, include } = buildFilters(req);
    const transactions = await Transaction.findAll({ where, include, order: [['paid_at', 'DESC']] });

    if (!transactions.length) {
      return res.status(404).json({ success: false, message: 'No transactions found for the selected filters.' });
    }

    const format = req.input('format', 'csv');
    if (format === 'excel') return exportExcel(res, transactions);
    if (format === 'pdf') return exportPdf(res, transactions);
    return exportCsv(res, transactions);
  },
};
