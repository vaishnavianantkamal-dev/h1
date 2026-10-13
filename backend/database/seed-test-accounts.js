const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function getDatesForOneYear() {
  const dates = [];
  const start = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function seedDatabase(config, name) {
  console.log(`\n--- Seeding ${name} ---`);
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log(`Connected to ${name}`);

    // Check roles
    const [roles] = await connection.query("SELECT id, slug FROM roles");
    const roleMap = Object.fromEntries(roles.map(r => [r.slug, r.id]));
    const customerRoleId = roleMap['customers'] || 3;
    const workerRoleId = roleMap['workers'] || 4;

    const hashedPassword = bcrypt.hashSync('123456', 10);
    const now = new Date();
    const expiryDate = '2099-12-31 23:59:59';

    // 1. Seed Customer 9999999999
    const [existingCust] = await connection.query("SELECT id FROM users WHERE phone = '9999999999'");
    let customerUserId;
    if (existingCust.length > 0) {
      customerUserId = existingCust[0].id;
      await connection.query(
        "UPDATE users SET role_id = ?, name = 'Test Customer', email = 'testcustomer@example.com', password = ?, is_active = 1, is_phone_verified = 1, updated_at = ? WHERE id = ?",
        [customerRoleId, hashedPassword, now, customerUserId]
      );
      console.log(`Updated Customer User ID: ${customerUserId}`);
    } else {
      const [insertRes] = await connection.query(
        "INSERT INTO users (role_id, name, phone, email, password, is_active, is_phone_verified, referral_code, created_at, updated_at) VALUES (?, 'Test Customer', '9999999999', 'testcustomer@example.com', ?, 1, 1, 'CUST9999', ?, ?)",
        [customerRoleId, hashedPassword, now, now]
      );
      customerUserId = insertRes.insertId;
      console.log(`Created Customer User ID: ${customerUserId}`);
    }

    // Ensure customer row
    const [custRow] = await connection.query("SELECT id FROM customers WHERE user_id = ?", [customerUserId]);
    if (custRow.length === 0) {
      await connection.query(
        "INSERT INTO customers (user_id, address, created_at, updated_at) VALUES (?, 'Test Address, Pune', ?, ?)",
        [customerUserId, now, now]
      );
      console.log('Created customer record');
    }

    // Customer OTP in otp_verifications
    const [custOtp] = await connection.query("SELECT id FROM otp_verifications WHERE phone = '9999999999'");
    if (custOtp.length > 0) {
      await connection.query(
        "UPDATE otp_verifications SET otp = '123456', expires_at = ?, attempts = 0, updated_at = ? WHERE phone = '9999999999'",
        [expiryDate, now]
      );
    } else {
      await connection.query(
        "INSERT INTO otp_verifications (phone, otp, expires_at, attempts, created_at, updated_at) VALUES ('9999999999', '123456', ?, 0, ?, ?)",
        [expiryDate, now, now]
      );
    }
    console.log('Customer OTP verified row set: 9999999999 -> 123456');

    // 2. Seed Worker 8888888888
    const [existingWorker] = await connection.query("SELECT id FROM users WHERE phone = '8888888888'");
    let workerUserId;
    const catIds = JSON.stringify([1, 2, 6]);
    const srvIds = JSON.stringify([2, 26, 30, 31]);

    if (existingWorker.length > 0) {
      workerUserId = existingWorker[0].id;
      await connection.query(
        "UPDATE users SET role_id = ?, name = 'Test Worker', email = 'testworker@example.com', password = ?, is_active = 1, is_phone_verified = 1, category_ids = ?, service_ids = ?, city_id = 1, updated_at = ? WHERE id = ?",
        [workerRoleId, hashedPassword, catIds, srvIds, now, workerUserId]
      );
      console.log(`Updated Worker User ID: ${workerUserId}`);
    } else {
      const [insertRes] = await connection.query(
        "INSERT INTO users (role_id, name, phone, email, password, is_active, is_phone_verified, category_ids, service_ids, city_id, created_at, updated_at) VALUES (?, 'Test Worker', '8888888888', 'testworker@example.com', ?, 1, 1, ?, ?, 1, ?, ?)",
        [workerRoleId, hashedPassword, catIds, srvIds, now, now]
      );
      workerUserId = insertRes.insertId;
      console.log(`Created Worker User ID: ${workerUserId}`);
    }

    // Ensure worker row
    const [workerRow] = await connection.query("SELECT id FROM workers WHERE user_id = ?", [workerUserId]);
    if (workerRow.length === 0) {
      await connection.query(
        "INSERT INTO workers (user_id, full_name, phone, kyc_status, wallet_balance, current_address, permanent_address, created_at, updated_at) VALUES (?, 'Test Worker', '8888888888', 'approved', 1000.00, 'Nashik', 'Nashik', ?, ?)",
        [workerUserId, now, now]
      );
      console.log('Created worker record');
    } else {
      await connection.query(
        "UPDATE workers SET kyc_status = 'approved', full_name = 'Test Worker', phone = '8888888888', updated_at = ? WHERE user_id = ?",
        [now, workerUserId]
      );
      console.log('Updated worker record to approved KYC');
    }

    // Ensure worker_availabilities
    const availableDates = JSON.stringify(getDatesForOneYear());
    const availableTimes = JSON.stringify([{ start: '09:00', end: '18:00' }]);
    const [availRow] = await connection.query("SELECT id FROM worker_availabilities WHERE worker_id = ?", [workerUserId]);
    if (availRow.length === 0) {
      await connection.query(
        "INSERT INTO worker_availabilities (worker_id, available_dates, available_times, status, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
        [workerUserId, availableDates, availableTimes, now, now]
      );
      console.log('Created worker availability');
    } else {
      await connection.query(
        "UPDATE worker_availabilities SET available_dates = ?, available_times = ?, status = 1, updated_at = ? WHERE worker_id = ?",
        [availableDates, availableTimes, now, workerUserId]
      );
      console.log('Updated worker availability');
    }

    // Worker OTP in otp_verifications
    const [workerOtp] = await connection.query("SELECT id FROM otp_verifications WHERE phone = '8888888888'");
    if (workerOtp.length > 0) {
      await connection.query(
        "UPDATE otp_verifications SET otp = '123456', expires_at = ?, attempts = 0, updated_at = ? WHERE phone = '8888888888'",
        [expiryDate, now]
      );
    } else {
      await connection.query(
        "INSERT INTO otp_verifications (phone, otp, expires_at, attempts, created_at, updated_at) VALUES ('8888888888', '123456', ?, 0, ?, ?)",
        [expiryDate, now, now]
      );
    }
    console.log('Worker OTP verified row set: 8888888888 -> 123456');

  } catch (err) {
    console.error(`Error seeding ${name}:`, err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

(async () => {
  require('dotenv').config();
  const config = require('../src/config');

  try {
    await seedDatabase({
      host: config.db.host,
      port: config.db.port,
      user: config.db.username,
      password: config.db.password,
      database: config.db.database,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    }, `${config.db.database} (${config.db.host})`);
  } catch (e) {
    console.error('Database seed failed:', e.message);
  }

  console.log('\nSeeding completed successfully!');
})();
