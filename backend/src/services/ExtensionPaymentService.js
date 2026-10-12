// Port of App\Services\ExtensionPaymentService
const axios = require('axios');
const config = require('../config');

class ExtensionPaymentService {
  async createLink(extensionId, amount, phone) {
    const key = config.razorpay.key;
    const secret = config.razorpay.secret;
    if (!key || !secret) throw new Error('Razorpay credentials missing');

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const reference = `EXT_${extensionId}_${Math.floor(Date.now() / 1000)}`;

    const response = await axios.post('https://api.razorpay.com/v1/payment_links', {
      amount: Math.round(Number(amount) * 100), // paise
      currency: 'INR',
      description: 'Service Extension Payment',
      reference_id: reference,
      customer: { contact: cleanPhone },
      notify: { sms: false, email: false },
    }, { auth: { username: key, password: secret }, validateStatus: () => true });

    if (response.status < 200 || response.status >= 300) {
      console.error('Extension link failed', JSON.stringify(response.data));
      throw new Error('Payment link failed');
    }

    return { id: response.data.id, short_url: response.data.short_url, reference };
  }
}

module.exports = new ExtensionPaymentService();
module.exports.ExtensionPaymentService = ExtensionPaymentService;
