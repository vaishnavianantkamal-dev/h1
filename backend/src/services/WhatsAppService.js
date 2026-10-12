// Port of app/Services/WhatsAppService.php (the active, non-commented class)
const axios = require('axios');
const config = require('../config');

const http = axios.create({ validateStatus: () => true });

// PHP json_decode(..., true) then json_encode: empty JSON objects ({}) come back as empty arrays ([])
const phpRoundtrip = (v) => {
  if (Array.isArray(v)) return v.map(phpRoundtrip);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (!keys.length) return [];
    const o = {};
    for (const k of keys) o[k] = phpRoundtrip(v[k]);
    return o;
  }
  return v;
};

class WhatsAppService {
  get apiUrl() { return config.whatsapp.apiUrl; } // config('whatsapp.api_url') = WHATSAPP_API_URL
  get accessToken() { return config.whatsapp.accessToken; }

  formatPhone(phone) {
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    return clean;
  }

  /**
   * sendBookingTemplate(coordinatorPhone, coordinatorName, customer{name,phone,...}, booking{service,worker,datetime,amount,status,address,location})
   * -> { success: true, data } | { success: false, error }
   */
  async sendBookingTemplate(coordinatorPhone, coordinatorName, customer, booking) {
    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhone(coordinatorPhone),
      type: 'template',
      template: {
        name: 'booking_history', // exact template name on Meta
        language: { code: 'en_US' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: String(coordinatorName) }, // {{1}}
            { type: 'text', text: String(customer.name) }, // {{2}}
            { type: 'text', text: String(customer.phone) }, // {{3}}
            { type: 'text', text: String(booking.service) }, // {{4}}
            { type: 'text', text: String(booking.worker) }, // {{5}}
            { type: 'text', text: String(booking.datetime) }, // {{6}}
            { type: 'text', text: String(booking.amount) }, // {{7}}
            { type: 'text', text: String(booking.status) }, // {{8}}
            { type: 'text', text: String(booking.address) }, // {{9}}
            { type: 'text', text: String(booking.location) }, // {{10}}
          ],
        }],
      },
    };

    try {
      const response = await http.post(this.apiUrl, payload, { headers: { Authorization: `Bearer ${this.accessToken}` } });

      if (response.status >= 200 && response.status < 300) {
        console.log('WhatsApp booking sent', { to: coordinatorPhone });
        return { success: true, data: phpRoundtrip(response.data) };
      }

      console.error('WhatsApp error', { body: response.data });
      return { success: false, error: phpRoundtrip(response.data) };
    } catch (e) {
      console.error('WhatsApp exception', { message: e.message });
      return { success: false, error: e.message };
    }
  }
}

module.exports = new WhatsAppService();
module.exports.WhatsAppService = WhatsAppService;
