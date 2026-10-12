// Port of app/Services/FirebaseService.php (worker app Firebase project).
// firebase-admin is initialised lazily and fails soft when the credentials file is missing.
const fs = require('fs');
const path = require('path');
const config = require('../config');

const apps = {}; // name -> firebase app | null

/** Lazily initialise a named firebase-admin app. Returns null (and logs) if unavailable. */
function getApp(name, credentialsPath) {
  if (name in apps) return apps[name];
  try {
    const file = path.resolve(credentialsPath);
    if (!fs.existsSync(file)) {
      console.error(`Firebase credentials not found at ${file} - push notifications disabled (${name}).`);
      apps[name] = null;
      return null;
    }
    const admin = require('firebase-admin');
    const opts = { credential: admin.credential.cert(JSON.parse(fs.readFileSync(file, 'utf8'))) };
    if (name === 'worker' && config.firebase.databaseUrl) opts.databaseURL = config.firebase.databaseUrl;
    apps[name] = admin.initializeApp(opts, name);
  } catch (e) {
    console.error(`Firebase init failed (${name}): ${e.message}`);
    apps[name] = null;
  }
  return apps[name];
}

/**
 * Shared data-only multicast (Android) + APNs alert (iOS), pruning failed tokens from user_fcm_tokens.
 * Returns { successCount, failureCount, responses } or null (nothing sent / error).
 */
async function sendMulticast(app, label, tokens, title, body, data = {}) {
  tokens = (tokens || []).filter(Boolean);
  if (!tokens.length) {
    console.warn(`${label}: no FCM tokens to send to.`);
    return null;
  }
  if (!app) {
    console.error(`${label} error: firebase not configured`);
    return null;
  }

  const stringData = {};
  Object.entries({ ...data, title, body }).forEach(([k, v]) => { stringData[k] = v === null || v === undefined ? '' : String(v); });

  const message = {
    tokens,
    data: stringData, // data-only (no notification block) on Android
    android: { priority: 'high' },
    // iOS: real ALERT push (killed iOS apps are not woken for data-only pushes). Alert lives ONLY in APNs config.
    apns: {
      headers: { 'apns-push-type': 'alert', 'apns-priority': '10' },
      payload: { aps: { alert: { title, body }, sound: 'default', 'mutable-content': 1 } },
    },
  };

  try {
    const report = await app.messaging().sendEachForMulticast(message);
    console.log(`${label} FCM sent`, { success_count: report.successCount, failure_count: report.failureCount });

    if (report.failureCount > 0) {
      const { UserFcmToken } = require('../models');
      for (let i = 0; i < report.responses.length; i++) {
        const r = report.responses[i];
        if (!r.success) {
          const failedToken = tokens[i];
          console.warn('FCM token failed - removing', { token: failedToken, error: r.error && r.error.message });
          await UserFcmToken.destroy({ where: { fcm_token: failedToken } });
        }
      }
    }
    return report;
  } catch (e) {
    console.error(`${label} error: ${e.message}`);
    return null;
  }
}

class FirebaseService {
  /**
   * sendToMultiple(tokens, title, body, data = {}, withNotification = false, imageUrl = null)
   * (withNotification / imageUrl are deprecated no-ops, as in PHP). Also accepts a single options
   * object { tokens, title, body, data } to mirror PHP named arguments.
   */
  async sendToMultiple(tokens, title, body, data = {}, withNotification = false, imageUrl = null) {
    if (tokens && !Array.isArray(tokens) && typeof tokens === 'object') {
      ({ tokens, title, body, data = {} } = tokens);
    }
    const app = getApp('worker', config.firebase.credentials);
    return sendMulticast(app, 'FirebaseService', tokens, title, body, data);
  }
}

module.exports = new FirebaseService();
module.exports.FirebaseService = FirebaseService;
module.exports.getApp = getApp;
// Push notifications are best-effort: when Firebase credentials are missing these guards only log a warning (PHP threw a
// 500 here, which broke assign-booking / OTP verify / tracking whenever push was not configured). Sending itself is a no-op
// without credentials - see sendMulticast().
let warned = false;
const warnOnce = (msg) => { if (!warned) { warned = true; console.warn('[firebase] ' + msg + ' - push notifications are disabled'); } };
module.exports.requireMessaging = () => {
  if (!getApp('worker', config.firebase.credentials)) warnOnce('worker Firebase credentials not configured');
};
module.exports.requireNotificationService = () => {
  module.exports.requireMessaging();
  if (!getApp('customer', config.firebase.customerCredentials)) warnOnce('customer Firebase credentials not configured');
};
module.exports.sendMulticast = sendMulticast;
