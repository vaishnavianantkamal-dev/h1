// Mirrors routes/console.php (Laravel scheduler). Call start() once at boot (server.js).
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const config = require('../config');
const queue = require('./queue');

const TZ = config.timezone || 'Asia/Kolkata';
const tasks = [];

// Register every job file so queue handlers exist (queue.js / scheduler.js excluded)
function loadJobs() {
  for (const f of fs.readdirSync(__dirname)) {
    if (!f.endsWith('.js') || f === 'queue.js' || f === 'scheduler.js') continue;
    require(path.join(__dirname, f));
  }
}

// expression: node-cron expression; withoutOverlapping -> in-memory flag per task
function schedule(name, expression, fn, { withoutOverlapping = false } = {}) {
  let running = false;
  const task = cron.schedule(expression, async () => {
    if (withoutOverlapping && running) return;
    running = true;
    try {
      await fn();
    } catch (e) {
      console.error(`[scheduler] ${name} failed:`, e && e.stack ? e.stack : e);
    } finally {
      running = false;
    }
  }, { timezone: TZ });
  tasks.push(task);
  console.log(`[scheduler] scheduled ${name} (${expression}${withoutOverlapping ? ', withoutOverlapping' : ''})`);
  return task;
}

function start() {
  loadJobs();

  const everyMinute = '* * * * *';

  // Schedule::command('instant:cron')->everyMinute();
  schedule('instant:cron', everyMinute, () => require('../commands/instantBookingCron').run());

  // 15-minutes-before-service-end reminder -> FCM to customer, worker(s), coordinator(s)
  schedule('bookings:end-reminder', everyMinute, () => require('../commands/sendServiceEndReminder').run(), { withoutOverlapping: true });

  // Schedule::job(new SendCloseOtpJob)->everyTenMinutes();  (queued job)
  schedule('SendCloseOtpJob', '*/10 * * * *', () => queue.dispatch('SendCloseOtpJob', {}));

  schedule('bookings:send-alerts', everyMinute, () => require('../commands/sendBookingAlerts').run(), { withoutOverlapping: true });

  // Schedule::command('subscriptions:auto-resume')->dailyAt('00:00');
  schedule('subscriptions:auto-resume', '0 0 * * *', () => require('../commands/autoResumeSubscriptions').run());

  // Member subscription expiry: reminder 2 days before end_date, notice once after it ends.
  schedule('subscriptions:expiry-notify', '0 9 * * *', () => require('../commands/sendMembershipExpiryReminder').run(), { withoutOverlapping: true });

  // Schedule::call(fn () => (new ResetSubscriptionStatus())->handle())->name('reset-subscription-status')
  schedule('reset-subscription-status', everyMinute, () => require('./ResetSubscriptionStatus').handle(), { withoutOverlapping: true });

  // WhatsApp invoice + thank-you message for paid bookings (moved from cron-job.org)
  schedule('send-paid-booking-invoices', everyMinute, () => require('../modules/payments/cronBookingInvoice.controller').run(), { withoutOverlapping: true });

  // NOTE: bookings:cancel-unpaid and the SyncRazorpayTransactions command are not scheduled in routes/console.php.
}

function stop() {
  tasks.forEach((t) => t.stop());
}

module.exports = { start, stop };
