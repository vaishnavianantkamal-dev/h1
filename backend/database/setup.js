// One-shot setup for a NEW, empty Hobit database:  npm run db:setup   (npm run db:fresh drops every table first)
//   1. creates the database if missing   2. creates all tables from the models (+ the 3 tables used only via raw SQL)
//   3. seeds roles, permissions, time slots, base settings, the monthly subscription type, the campaign copy library
//   4. creates the first super-admin (SEED_ADMIN_PHONE / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env)
// Safe to re-run: every seed step is "find or create".
require('dotenv').config();
process.env.TZ = 'Asia/Kolkata';
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const config = require('../src/config');

const FRESH = process.argv.includes('--fresh');

// Tables the code reads/writes with raw SQL only (no Sequelize model), taken from the Laravel migrations.
const RAW_TABLES = [
  `CREATE TABLE IF NOT EXISTS booking_reschedules (
     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL,
     old_date DATE NULL, old_time_slot VARCHAR(255) NULL, new_date DATE NOT NULL, new_time_slot VARCHAR(255) NOT NULL,
     reason VARCHAR(255) NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS whatsapp_payment_requests (
     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL, upi_link VARCHAR(255) NOT NULL,
     status ENUM('sent','paid_clicked','expired') NOT NULL DEFAULT 'sent', created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL,
     INDEX (booking_id), FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS whatsapp_webhooks (
     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, \`from\` VARCHAR(255) NOT NULL, flow_token VARCHAR(255) NULL,
     payload JSON NOT NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, INDEX (\`from\`))`,
];

// IDs matter: the code hard-codes role_id 1 (super-admin) and role_id 6 (co-ordinators).
const ROLES = [
  ['super-admin', 'Super Admin'], ['city-admin', 'City Admin'], ['customers', 'Customers'], ['workers', 'Workers'],
  ['contractors', 'Contractors'], ['co-ordinators', 'Co-ordinators'], ['operation-head', 'Operation Head'], ['staff', 'Staff'],
];

// database/seeders/PermissionSeeder.php
const PERMISSIONS = [
  ['Dashboard', 'dashboard'], ['User Types & Roles', 'user_roles'], ['Workers', 'workers'], ['Customers', 'customers'],
  ['Service Categories', 'service_categories'], ['Orders / Booking', 'orders'], ['Withdrawal', 'withdrawal'],
  ['Transactions', 'transactions'], ['Referrals', 'referrals'], ['Location & Zone', 'location_zone'],
  ['Commission', 'commission'], ['Settings', 'settings'], ['Survey Details', 'survey_details'],
];

// Neutral defaults (money values 0) - set the real numbers from Admin > Settings.
const SETTINGS = [
  ['platform_fee', '0', 'Platform fee added to every booking'],
  ['travelling_charge', '0', 'Travelling charge added to every booking'],
  ['subscription_fee', '0', 'One-time fee for a first-time subscriber'],
  ['gst_percent', '0', 'GST % on the item total'],
  ['rain_charge', '0', 'Surcharge for instant bookings while it is raining (0 = off)'],
  ['business_closing_time', '18:00', 'Last time a service may end'],
];

// database/seeders/NotificationCampaignSeeder.php  [category, title, body]
const CAMPAIGNS = [
  ['subscription', 'Still booking every day?', 'Switch to a Monthly Plan and save up to 50%. 💙'],
  ['subscription', '💰 Stop paying more!', 'One monthly plan. One trusted expert. Big savings.'],
  ['subscription', '✨ Your home deserves consistency.', 'Book a Monthly Plan and enjoy hassle-free home care.'],
  ['subscription', '📅 Smarter home care starts here.', 'Switch to Monthly and save on every visit.'],
  ['subscription', 'Daily bookings add up.', 'Monthly saves more.'],
  ['subscription', 'One decision. Months of convenience.', ''],
  ['subscription', 'Switch once. Save every visit.', 'Your wallet will thank you. 💙'],
  ['cook', '🍲 Didn’t know we cook too?', 'Fresh homemade meals are now just a tap away.'],
  ['cook', '👩‍🍳 Skip the kitchen today.', 'Let a trusted Hobit Cook prepare your meals.'],
  ['cook', '🥘 Homemade food. Zero hassle.', 'Book a Hobit Cook and enjoy every bite.'],
  ['cook', '🍛 Fresh meals, made at home.', 'Your Hobit Cook is ready whenever you are.'],
  ['cook', 'Your kitchen misses you less than you think. 🍛', ''],
  ['cook', 'Fresh rotis > food delivery.', ''],
  ['cook', 'Home-cooked meals are back.', ''],
  ['cook', 'Today’s special? Not cooking.', ''],
  ['cook', 'Good food. No dishes to worry about.', ''],
  ['general', '🧹 Need help today?', 'A verified Hobit Expert is just a tap away.'],
  ['general', '🏠 Your home can’t wait.', 'Book trusted home help in minutes.'],
  ['offers', '🎉 ₹100 OFF is waiting!', 'Use HOBIT100 on your first 3 bookings.'],
  ['offers', '🔥 Limited-time savings!', 'Book today and unlock exclusive offers.'],
  ['reengagement', 'We miss you! 👋', 'Your trusted Hobit Expert is waiting.'],
  ['reengagement', 'It’s been a while!', 'Let us take care of your home again. 💙'],
  ['curiosity', '🤫 Psst... your home called.', 'It says it’s ready for a little Hobit magic.'],
  ['curiosity', 'You forgot one thing today... 🏡', 'A clean home.'],
  ['curiosity', 'Guess what’s cooking? 🍲', 'It might not have to be you tonight.'],
  ['curiosity', 'What if weekends stayed weekends? 😌', 'We’ll handle the chores.'],
  ['curiosity', 'One tap can change your evening. ✨', 'We’ll take care of the rest.'],
  ['relatable', 'Your sink has been staring at you all day. 👀', 'Maybe it’s time for Hobit.'],
  ['relatable', 'Your broom deserves a day off too. 🧹', ''],
  ['relatable', 'Still negotiating with your didi?', 'Book a verified Hobit Expert instead.'],
  ['relatable', 'Monday called.', 'It left chores behind.'],
  ['trust', 'Every expert is verified.', 'Every visit is reliable.'],
  ['trust', 'More family time. Less cleaning time.', ''],
  ['trust', 'Skip the chores. Keep the peace.', ''],
  ['trust', 'Spend your Sunday relaxing—not cleaning.', ''],
  ['weather', 'Rain outside. Relax inside.', 'We’ll handle the house.'],
  ['weekend', 'Weekends are for memories.', 'Not mopping floors.'],
  ['weekend', 'Sunday checklist:', '✅ Relax   ❌ Cleaning'],
  ['fomo', 'People near you are booking Hobit today.', ''],
  ['fomo', 'Your favourite expert is available today.', ''],
  ['fomo', 'Today’s slots are filling fast.', ''],
  ['fomo', 'Luxury isn’t always expensive. Sometimes it’s just having help.', ''],
  ['festival', 'Guests coming over?', 'We’ll make your home guest-ready.'],
  ['festival', 'Celebrate. We’ll clean.', ''],
  ['festival', 'This festive season, leave the chores to us.', ''],
];

async function ensureDatabase() {
  const c = await mysql.createConnection({ host: config.db.host, port: config.db.port, user: config.db.username, password: config.db.password });
  await c.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await c.end();
}

(async () => {
  await ensureDatabase();
  const { sequelize, Role, Permission, Setting, TimeSlot, SubscriptionType, NotificationCampaign, User, Customer, Worker, WorkerAvailability, OtpVerification } = require('../src/models');
  const hash = require('../src/utils/hash');
  await sequelize.authenticate();

  if (FRESH) {
    console.log('[setup] --fresh: dropping all tables');
    await sequelize.query('SET FOREIGN_KEY_CHECKS=0');
    const [rows] = await sequelize.query('SHOW TABLES');
    for (const r of rows) await sequelize.query(`DROP TABLE IF EXISTS \`${Object.values(r)[0]}\``);
    await sequelize.query('SET FOREIGN_KEY_CHECKS=1');
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS=0');
  await sequelize.sync();
  await sequelize.query('SET FOREIGN_KEY_CHECKS=1');
  for (const sql of RAW_TABLES) await sequelize.query(sql);
  console.log('[setup] tables ready');

  // Roles - created in a fixed order so ids are 1..8 on an empty table.
  for (const [slug, name] of ROLES) await Role.findOrCreate({ where: { slug }, defaults: { slug, name, is_system: true } });
  for (const [name, slug] of PERMISSIONS) await Permission.findOrCreate({ where: { slug }, defaults: { name, slug } });
  for (const [key, value, description] of SETTINGS) await Setting.findOrCreate({ where: { key }, defaults: { key, value, description } });

  // Time slots 09:00..18:00 every 30 min (TimeSlotSeeder)
  let order = 1;
  for (let m = 9 * 60; m <= 18 * 60; m += 30, order += 1) {
    const slot_time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
    await TimeSlot.findOrCreate({ where: { slot_time }, defaults: { slot_time, label: null, price: null, sort_order: order, is_active: true } });
  }

  // The monthly subscription type - its id must equal MONTHLY_SUBSCRIPTION_TYPE_ID (default 4).
  const monthlyId = Number(config.services.monthlySubscriptionTypeId) || 4;
  await SubscriptionType.findOrCreate({ where: { id: monthlyId }, defaults: { id: monthlyId, name: 'Monthly Subscription' } });

  for (const [category, title, body] of CAMPAIGNS) {
    await NotificationCampaign.findOrCreate({ where: { category, title }, defaults: { category, title, body, segment: 'all_customers', status: 'draft' } });
  }

  // First super-admin
  const phone = process.env.SEED_ADMIN_PHONE;
  const email = process.env.SEED_ADMIN_EMAIL || config.mail.adminEmail;
  let adminLine = '[setup] SEED_ADMIN_PHONE not set - skipped creating the first admin (set it in .env and re-run)';
  if (phone) {
    const exists = await User.findOne({ where: { phone }, paranoid: false });
    if (exists) adminLine = `[setup] admin ${phone} already exists`;
    else {
      const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
      const role = await Role.findOne({ where: { slug: 'super-admin' } });
      await User.create({ role_id: role.id, name: 'Super Admin', phone, email, password: hash.make(password), is_active: true, is_phone_verified: true });
      adminLine = `[setup] created super-admin  login: ${email} or ${phone}`
        + (process.env.SEED_ADMIN_PASSWORD ? '' : `  password: ${password}   (shown once - change it)`);
    }
  }
  console.log(adminLine);

  // Seed Customer (9999999999, OTP 123456)
  const custRole = await Role.findOne({ where: { slug: 'customers' } });
  const [custUser] = await User.findOrCreate({
    where: { phone: '9999999999' },
    defaults: {
      role_id: custRole.id,
      name: 'Test Customer',
      phone: '9999999999',
      email: 'testcustomer@example.com',
      password: hash.make('123456'),
      is_active: true,
      is_phone_verified: true,
      referral_code: 'CUST9999',
    },
  });
  await Customer.findOrCreate({ where: { user_id: custUser.id }, defaults: { user_id: custUser.id, address: 'Test Address, Pune' } });
  await OtpVerification.upsert({
    phone: '9999999999',
    otp: '123456',
    expires_at: '2099-12-31 23:59:59',
    attempts: 0,
  });
  console.log('[setup] seeded customer: 9999999999 (OTP 123456)');

  // Seed Worker (8888888888, OTP 123456)
  const workerRole = await Role.findOne({ where: { slug: 'workers' } });
  const [workerUser] = await User.findOrCreate({
    where: { phone: '8888888888' },
    defaults: {
      role_id: workerRole.id,
      name: 'Test Worker',
      phone: '8888888888',
      email: 'testworker@example.com',
      password: hash.make('123456'),
      is_active: true,
      is_phone_verified: true,
      category_ids: [1, 2, 6],
      service_ids: [2, 26, 30, 31],
      city_id: 1,
    },
  });
  await Worker.findOrCreate({
    where: { user_id: workerUser.id },
    defaults: {
      user_id: workerUser.id,
      full_name: 'Test Worker',
      phone: '8888888888',
      kyc_status: 'approved',
      wallet_balance: 1000.00,
    },
  });
  const defaultDates = [];
  const startD = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(startD);
    d.setDate(d.getDate() + i);
    defaultDates.push(d.toISOString().slice(0, 10));
  }
  await WorkerAvailability.findOrCreate({
    where: { worker_id: workerUser.id },
    defaults: {
      worker_id: workerUser.id,
      available_dates: defaultDates,
      available_times: [{ start: '09:00', end: '18:00' }],
      status: true,
    },
  });
  await OtpVerification.upsert({
    phone: '8888888888',
    otp: '123456',
    expires_at: '2099-12-31 23:59:59',
    attempts: 0,
  });
  console.log('[setup] seeded worker: 8888888888 (OTP 123456)');

  console.log('[setup] done. Next: create cities, zones, service categories and services from the admin panel.');
  process.exit(0);
})().catch((e) => { console.error('[setup] FAILED:', e.message); process.exit(1); });
