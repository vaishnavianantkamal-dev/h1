// Equivalent of kreait's default Firebase project bindings used by the tracking code:
//   app(Kreait\Firebase\Contract\Auth::class)      -> auth()      (createCustomToken)
//   app(Kreait\Firebase\Contract\Database::class)  -> database()  (getReference(path).remove())
// Uses the default firebase-admin app (FIREBASE_CREDENTIALS / FIREBASE_DATABASE_URL), initialised lazily.
const config = require('../../config');

function adminApp() {
  const admin = require('firebase-admin');
  if (admin.apps.length) return admin.app();
  const path = require('path');
  const credPath = path.resolve(config.firebase.credentials);
  const opts = { credential: admin.credential.cert(require(credPath)) };
  if (config.firebase.databaseUrl) opts.databaseURL = config.firebase.databaseUrl;
  return admin.initializeApp(opts);
}

// $auth->createCustomToken($uid, $claims)->toString()
async function createCustomToken(uid, claims = {}) {
  return require('firebase-admin').auth(adminApp()).createCustomToken(String(uid), claims);
}

// $db->getReference($path)->remove()
async function removeReference(refPath) {
  return require('firebase-admin').database(adminApp()).ref(refPath).remove();
}

module.exports = { createCustomToken, removeReference, adminApp };
