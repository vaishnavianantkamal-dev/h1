// Port of app/Services/OtpService.php
const axios = require('axios');
const config = require('../config');
const { dayjs } = require('../utils/time');
const { sendMail } = require('./MailService');

// Laravel Http client does not throw on 4xx/5xx
// Guzzle serialises query params RFC3986 (space => %20, not +)
const rfc3986 = (v) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const http = axios.create({
  validateStatus: () => true,
  paramsSerializer: (params) => Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => rfc3986(k) + '=' + rfc3986(v)).join('&'),
});

class OtpService {
  generateOtp(length = 6) {
    const min = parseInt('1' + '0'.repeat(length - 1), 10);
    const max = parseInt('9'.repeat(length), 10);
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  formatPhone(phone) {
    phone = String(phone).replace(/\D/g, '');
    return phone.startsWith('91') ? phone : '91' + phone;
  }

  async sendWhatsapp(phone, message) {
    const url = config.whatsapp.apiUrl; // services.whatsapp.url (WHATSAPP_API_URL)
    const token = config.whatsapp.accessToken;

    if (!url || !token) {
      console.error('WhatsApp config missing');
      return;
    }

    await http.post(url, {
      messaging_product: 'whatsapp',
      to: this.formatPhone(phone),
      type: 'text',
      text: { body: message },
    }, { headers: { Authorization: `Bearer ${token}` } });
  }

  async sendWhatsappOtp(phone, otp) {
    const baseUrl = config.whatsapp.cloudApiUrl; // services.whatsapp.api_url (WHATSAPP_CLOUD_API_URL)
    const phoneNumberId = config.whatsapp.phoneNumberId;
    const token = config.whatsapp.accessToken;

    if (!baseUrl || !phoneNumberId || !token) {
      console.error('WhatsApp config missing');
      return;
    }

    const url = `${baseUrl}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhone(phone),
      type: 'template',
      template: {
        name: 'hobit_authentication',
        language: { code: 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: String(otp) }] },
          { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: String(otp) }] },
        ],
      },
    };

    await http.post(url, payload, { headers: { Authorization: `Bearer ${token}` } });
  }

  async sendSms(phone, message, templateId) {
    const baseUrl = config.sms.baseUrl;
    const apiKey = config.sms.apiKey;
    const senderId = config.sms.senderId;

    if (!baseUrl || !apiKey || !senderId || !templateId) {
      console.error('SMS config missing - check config.sms');
      return false;
    }

    // Strip country code for number field - API expects 10 digit with 91 prefix
    phone = String(phone).replace(/\D/g, '');
    if (phone.length === 12 && phone.startsWith('91')) {
      phone = phone.slice(2); // remove 91 prefix before re-adding
    }

    try {
      const response = await http.get(baseUrl, {
        params: {
          apikey: apiKey,
          senderid: senderId,
          templateid: templateId,
          dlt_templateid: templateId,
          number: '91' + phone,
          message,
        },
      });

      console.log(`SMS sent to ${phone} | Response: ${typeof response.data === 'string' ? response.data : JSON.stringify(response.data)}`);
      return response.status >= 200 && response.status < 300;
    } catch (e) {
      console.error(`SMS failed for ${phone}: ${e.message}`);
      return false;
    }
  }

  // SMS - LOGIN OTP
  async sendSmsOtp(phone, otp) {
    return this.sendSms(
      phone,
      `Your Login OTP is ${otp}. It is valid for 10 minutes. Please do not share this code with anyone. - Team hobit`,
      config.sms.templateIdLogin
    );
  }

  // SMS - SERVICE START OTP
  async sendStartSmsOtp(phone, otp) {
    return this.sendSms(
      phone,
      `Your OTP for starting the service is ${otp}. It is valid for 10 minutes. Please do not share this code with anyone. - Team hobit`,
      config.sms.templateIdStart
    );
  }

  // SMS - SERVICE CLOSE OTP
  async sendCloseSmsOtp(phone, otp) {
    return this.sendSms(
      phone,
      `Your OTP for closing the service is ${otp}. It is valid for 10 minutes. Please do not share this code with anyone. - Team hobit`,
      config.sms.templateIdClose
    );
  }

  /** CLOSE OTP (used by CRON & controller) */
  async sendCloseOtp(booking) {
    const { User, BookingOtp } = require('../models');
    const otp = this.generateOtp();
    const expires = dayjs().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss');

    const worker = await User.findByPk(booking.worker_id);

    if (!worker) {
      console.error('Worker not found');
      return;
    }

    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'worker',
      receiver_phone: worker.phone,
      otp,
      type: 'close',
      expires_at: expires,
    });

    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'customer',
      receiver_phone: booking.customer_phone,
      otp,
      type: 'close',
      expires_at: expires,
    });

    await this.sendWhatsapp(worker.phone, `\u{1F510} CLOSE SERVICE OTP: ${otp}`);

    const link = `${config.appUrl}/verify-otp/${booking.id}/close`;

    await this.sendWhatsapp(
      booking.customer_phone,
      `\u{1F4F2} Worker is closing service.\nConfirm here:\n${link}`
    );
  }

  async sendEmailOtp(email, otp) {
    return sendMail({ to: email, subject: 'OTP Verification', text: `Your OTP is: ${otp}` });
  }
}

module.exports = new OtpService();
module.exports.OtpService = OtpService;
