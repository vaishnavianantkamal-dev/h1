// Port of App\Console\Commands\SyncRazorpayTransactions  (php artisan razorpay:sync {--from=} {--to=} {--fresh})
// Usage: run({ from: '2024-01-01', to: '2024-02-01', fresh: false })  or  node -e "require('./src/commands/syncRazorpayTransactions').run()" -- --from=.. --to=.. --fresh
const Razorpay = require('razorpay');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const config = require('../config');
const { dayjs } = require('../utils/time');
const PhoneHelper = require('../helpers/PhoneHelper');
const { Transaction, User, Booking } = require('../models');

const notEmpty = (v) => v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0';

function argvOptions() {
  const o = {};
  process.argv.slice(2).forEach((a) => {
    const m = a.match(/^--([a-z]+)(?:=(.*))?$/);
    if (m) o[m[1]] = m[2] === undefined ? true : m[2];
  });
  return o;
}

function resolveStatus(payment) {
  if ((payment.refund_status || '') === 'full') return 'refunded';
  if ((payment.refund_status || '') === 'partial') return 'partially_refunded';
  return payment.status || 'unknown';
}

async function resolveUser(payment) {
  // Step 1 - booking_id from notes
  const bookingId = payment.notes && !Array.isArray(payment.notes) ? payment.notes.booking_id : null;
  if (bookingId) {
    const booking = await Booking.findByPk(bookingId);
    if (booking) return User.findByPk(booking.customer_id);
  }
  // Step 2 - phone match
  if (notEmpty(payment.contact)) {
    const phone = PhoneHelper.normalize(payment.contact);
    if (phone) {
      const user = await User.findOne({ where: sequelize.where(sequelize.fn('RIGHT', sequelize.col('phone'), 10), phone) });
      if (user) return user;
    }
  }
  // Step 3 - order_id / payment_ref match
  if (notEmpty(payment.order_id)) {
    const booking = await Booking.findOne({ where: { [Op.or]: [{ razorpay_link_id: payment.order_id }, { payment_ref: payment.id }] } });
    if (booking) return User.findByPk(booking.customer_id);
  }
  return null;
}

const dmy = (ts, withTime) => dayjs.unix(ts).format(withTime ? 'DD-MM-YYYY HH:mm' : 'DD-MM-YYYY');

async function run(options) {
  const opt = options || argvOptions();
  const api = new Razorpay({ key_id: config.razorpay.key, key_secret: config.razorpay.secret });

  if (opt.fresh) {
    await Transaction.destroy({ truncate: true });
    console.warn('Cleared all existing transactions.');
  }

  const from = opt.from ? dayjs(opt.from).startOf('day').unix() : dayjs('2024-01-01T00:00:00').unix();
  const to = opt.to ? dayjs(opt.to).endOf('day').unix() : dayjs().unix();

  console.log(`Syncing from ${dmy(from, true)} to ${dmy(to, true)}`);

  let total = 0;
  const limit = 100;

  // Paginate by timestamp chunks (7 days)
  let chunkStart = from;
  outer:
  while (chunkStart < to) {
    const chunkEnd = Math.min(chunkStart + 7 * 24 * 3600, to);
    let skip = 0;
    console.log(`  Chunk: ${dmy(chunkStart)} -> ${dmy(chunkEnd)}`);

    while (true) {
      let response;
      try {
        response = await api.payments.all({ from: chunkStart, to: chunkEnd, count: limit, skip });
      } catch (e) {
        console.error(`Razorpay API error: ${(e && (e.message || (e.error && e.error.description))) || e}`);
        break outer;
      }

      const items = (response && response.items) || [];
      if (!items.length) break;

      for (const payment of items) {
        const status = resolveStatus(payment);
        const user = await resolveUser(payment);
        const paidAt = payment.created_at !== undefined && payment.created_at !== null
          ? dayjs.unix(parseInt(payment.created_at, 10)).toDate()
          : null;

        const values = {
          amount: (payment.amount || 0) / 100,
          amount_refunded: (payment.amount_refunded || 0) / 100,
          currency: payment.currency || 'INR',
          method: payment.method || null,
          status,
          contact: payment.contact || null,
          email: payment.email || null,
          description: payment.description || null,
          order_id: payment.order_id || null,
          user_id: user ? user.id : null,
          paid_at: paidAt,
        };
        const existing = await Transaction.findOne({ where: { payment_id: payment.id } });
        if (existing) await existing.update(values);
        else await Transaction.create({ payment_id: payment.id, ...values });
        total++;
      }

      console.log(`  Synced ${total} so far...`);
      if (items.length < limit) break;
      skip += limit;
    }

    chunkStart = chunkEnd + 1;
  }

  console.log(`Sync complete. Total: ${total} payments.`);
  return 0;
}

module.exports = { run, signature: 'razorpay:sync', description: 'Sync Razorpay payments into local transactions table' };
