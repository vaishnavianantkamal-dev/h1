// Central config - mirrors Laravel's config/*.php + .env. Use config.x.y everywhere instead of process.env.
require('dotenv').config();
const env = process.env;
const int = (v, d) => (v === undefined || v === '' ? d : parseInt(v, 10));

module.exports = {
  env: env.NODE_ENV || 'development',
  port: int(env.PORT, 8000),
  appUrl: (env.APP_URL || 'http://localhost:8000').replace(/\/$/, ''),
  frontendUrl: (env.FRONTEND_URL || '').replace(/\/$/, ''),
  appName: env.APP_NAME || 'Hobit',
  timezone: 'Asia/Kolkata',
  appKey: env.APP_KEY || '',
  cronSecret: env.CRON_SECRET || env.CRON_SECRET_NEW || '',
  botApiKey: env.BOT_API_KEY || '', // WhatsApp bot -> /api/bot/* and /api/whatsapp/send*
  runScheduler: env.RUN_SCHEDULER !== 'false',
  // Hard-coded Play-Store review logins (customer 9999999999 / worker 8888888888, OTP 123456).
  // Active by default unless explicitly disabled with STATIC_LOGIN_ENABLED=false.
  staticLoginEnabled: env.STATIC_LOGIN_ENABLED !== 'false',
  corsOrigins: [
    'http://localhost:5173', 'http://localhost:5174',
    'https://hobitadmin.anantkamalsoftwarelabs.com', 'https://admin.hobit.club',
    'https://hobit.club', 'https://hobitadmin.hobit.club',
    ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) : []),
  ],
  db: {
    host: env.DB_HOST || '127.0.0.1', port: int(env.DB_PORT, 3306),
    database: env.DB_DATABASE || 'hobit', username: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || '', log: env.DB_LOG === 'true',
  },
  booking: { cancellationDeductionPercentage: int(env.BOOKING_CANCELLATION_DEDUCTION_PERCENT, 20) },
  razorpay: { key: env.RAZORPAY_KEY_ID, secret: env.RAZORPAY_KEY_SECRET, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET },
  services: {
    whatsappUrl: env.HOBIT_WHATSAPP_URL,
    instantExtendServiceId: env.INSTANT_EXTEND_SERVICE_ID,
    instantCategoryId: int(env.INSTANT_CATEGORY_ID, 6),
    weekdayCategoryId: env.WEEKDAY_CATEGORY_ID,
    workerWithdrawMinAmount: int(env.WORKER_WITHDRAW_MIN_AMOUNT, 100),
    rescheduleMaxPerMonth: int(env.RESCHEDULE_MAX_PER_MONTH, 4),
    rescheduleMaxPerWeek: int(env.RESCHEDULE_MAX_PER_WEEK, 1),
    rescheduleInstantMinHours: int(env.RESCHEDULE_INSTANT_MIN_HOURS, 3),
    rescheduleMonthlyMinHours: int(env.RESCHEDULE_MONTHLY_MIN_HOURS, 3),
    monthlySubscriptionTypeId: int(env.MONTHLY_SUBSCRIPTION_TYPE_ID, 4),
  },
  whatsapp: {
    accessToken: env.WHATSAPP_ACCESS_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    apiUrl: env.WHATSAPP_API_URL, cloudApiUrl: env.WHATSAPP_CLOUD_API_URL,
  },
  sms: {
    apiKey: env.SMS_API_KEY, senderId: env.SMS_SENDER_ID, templateId: env.SMS_TEMPLATE_ID,
    templateIdLogin: env.SMS_TEMPLATE_ID_LOGIN, templateIdStart: env.SMS_TEMPLATE_ID_START,
    templateIdClose: env.SMS_TEMPLATE_ID_CLOSE, baseUrl: env.SMS_API_BASE_URL,
  },
  surepass: { token: env.SUREPASS_API_TOKEN, baseUrl: env.SUREPASS_BASE_URL || 'https://sandbox.surepass.io/api/v1', redirectUrl: (env.APP_URL || '') + 'api/kyc/callback' },
  weather: {
    apiKey: env.WEATHERUNION_API_KEY,
    baseUrl: env.WEATHERUNION_BASE_URL || 'https://www.weatherunion.com/gw/weather/external/v0',
    defaultLocation: env.WEATHERUNION_DEFAULT_LOCATION || '18.5204,73.8567',
    cacheTtl: int(env.WEATHERUNION_CACHE_TTL, 600), timeout: int(env.WEATHERUNION_TIMEOUT, 10),
  },
  mail: {
    host: env.MAIL_HOST, port: int(env.MAIL_PORT, 2525), user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD,
    fromAddress: env.MAIL_FROM_ADDRESS || 'hello@example.com', fromName: env.MAIL_FROM_NAME || 'Hobit', adminEmail: env.ADMIN_EMAIL || 'admin@instantcook.com',
  },
  firebase: { credentials: env.FIREBASE_CREDENTIALS || './firebase/service-account.json', databaseUrl: env.FIREBASE_DATABASE_URL, customerCredentials: env.CUSTOMER_FIREBASE_CREDENTIALS || './storage/app/customer-firebase.json' },
};
