// Force the app timezone before anything touches Date (Laravel: config('app.timezone') = Asia/Kolkata)
process.env.TZ = 'Asia/Kolkata';
const config = require('./config');
const app = require('./app');
const { sequelize, initSchema } = require('./models');
const queue = require('./jobs/queue');

// Configuration sanity checks - warnings only, so a misconfigured server is obvious in the logs.
function startupChecks() {
  const warn = (m) => console.warn('[config] WARNING: ' + m);
  const key = config.appKey || '';
  const keyLen = key.startsWith('base64:') ? Buffer.from(key.slice(7), 'base64').length : Buffer.byteLength(key);
  if (keyLen !== 32) warn(`APP_KEY must be exactly 32 bytes (or "base64:" + 32 bytes); got ${keyLen}. Encrypted bank details will fail.`);
  if (config.env === 'production') {
    if (!config.cronSecret) warn('CRON_SECRET is empty - /api/cron/* endpoints stay locked.');
    if (!config.botApiKey) warn('BOT_API_KEY is empty - /api/bot/* and /api/whatsapp/send* answer 503.');
    if (config.staticLoginEnabled) warn('STATIC_LOGIN_ENABLED=true - the hard-coded review logins (OTP 123456) are active.');
    if (!config.razorpay.webhookSecret) warn('RAZORPAY_WEBHOOK_SECRET is empty - Razorpay webhooks will be rejected.');
  }
}

(async () => {
  startupChecks();
  try {
    await sequelize.authenticate();
    console.log('[db] MySQL connected');
    await initSchema(); // read real column types + add undeclared columns so output matches Eloquent
  } catch (e) {
    console.error('[db] connection failed:', e.message);
    process.exit(1);
  }

  if (config.runScheduler) {
    await queue.startWorker();
    try { require('./jobs/scheduler').start(); } catch (e) { console.error('[scheduler] not started:', e.message); }
  }

  app.listen(config.port, () => console.log(`[http] Hobit API listening on :${config.port}`));
})();

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
