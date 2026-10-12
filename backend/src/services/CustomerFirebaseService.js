// Port of app/Services/CustomerFirebaseService.php (SEPARATE customer-app Firebase project:
// storage/app/customer-firebase.json -> config.firebase.customerCredentials). Fails soft if missing.
const config = require('../config');
const { getApp, sendMulticast } = require('./FirebaseService');

class CustomerFirebaseService {
  /**
   * sendToMultiple(tokens, title, body, data = {}, withNotification = false, imageUrl = null)
   * withNotification / imageUrl deprecated + ignored (data-only push, as in PHP).
   * Also accepts one options object { tokens, title, body, data }.
   */
  async sendToMultiple(tokens, title, body, data = {}, withNotification = false, imageUrl = null) {
    if (tokens && !Array.isArray(tokens) && typeof tokens === 'object') {
      ({ tokens, title, body, data = {} } = tokens);
    }
    const app = getApp('customer', config.firebase.customerCredentials);
    return sendMulticast(app, 'CustomerFirebaseService', tokens, title, body, data);
  }
}

module.exports = new CustomerFirebaseService();
module.exports.CustomerFirebaseService = CustomerFirebaseService;
