// Port of App\Services\RazorpayService
const axios = require('axios');
const config = require('../config');

class RazorpayService {
  async createPaymentLink(referenceId, amount, phone, description = 'Payment') {
    const key = config.razorpay.key;
    const secret = config.razorpay.secret;
    if (!key || !secret) throw new Error('Razorpay keys missing');

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);

    const response = await axios.post('https://api.razorpay.com/v1/payment_links', {
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      description,
      reference_id: String(referenceId),
      customer: { contact: cleanPhone },
      notify: { sms: false, email: false },
    }, { auth: { username: key, password: secret }, validateStatus: () => true });

    if (response.status < 200 || response.status >= 300) {
      console.error('Razorpay link failed', JSON.stringify({ reference_id: referenceId, response: response.data }));
      throw new Error('Payment link failed');
    }

    return { id: response.data.id, short_url: response.data.short_url, reference: referenceId };
  }

  async cancelPaymentLink(linkId) {
    await axios.post(`https://api.razorpay.com/v1/payment_links/${linkId}/cancel`, null, {
      auth: { username: config.razorpay.key || '', password: config.razorpay.secret || '' },
      validateStatus: () => true,
    });
  }
}

module.exports = new RazorpayService();
module.exports.RazorpayService = RazorpayService;
