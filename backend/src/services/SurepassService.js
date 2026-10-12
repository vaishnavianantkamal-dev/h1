// Port of app/Services/SurepassService.php (DigiLocker KYC). Tries multiple TLS cipher sets until one connects
// (the Surepass sandbox has flaky TLS); TLS verification is disabled exactly as in PHP.
const https = require('https');
const axios = require('axios');
const config = require('../config');

const CIPHER_SETS = [
  'DEFAULT@SECLEVEL=1',
  'AES128-SHA',
  'AES256-SHA',
  'AES128-SHA256',
  'AES256-SHA256',
  'ECDHE-RSA-AES128-SHA',
  'ECDHE-RSA-AES256-SHA',
  'ECDHE-RSA-AES128-SHA256',
  'DEFAULT@SECLEVEL=0',
];

class SurepassService {
  constructor() {
    this.cipherSets = CIPHER_SETS;
  }

  get token() { return config.surepass.token; }
  get redirectUrl() { return config.surepass.redirectUrl; }

  async makeRequest(method, url, payload, cipher) {
    const agent = new https.Agent({
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.2',
      ciphers: cipher,
      family: 4,
    });

    let response;
    try {
      response = await axios.request({
        method,
        url,
        data: method === 'POST' ? JSON.stringify(payload) : undefined,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'HobitKYC/1.0',
        },
        httpsAgent: agent,
        timeout: 30000,
        maxRedirects: 5,
        transformResponse: [(d) => d], // keep raw text, parse like json_decode
        validateStatus: () => true,
      });
    } catch (e) {
      throw new Error(`cURL Error [${e.code || 0}]: ${e.message}`);
    }

    const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    console.log('Surepass API success', { url, method, cipher, http: response.status });

    let result;
    try {
      result = JSON.parse(raw);
    } catch (_) {
      throw new Error('Invalid JSON: ' + raw.slice(0, 300));
    }

    if (response.status >= 400) {
      console.error('Surepass HTTP Error', { code: response.status, response: result, url });
      throw new Error((result && result.message) || `HTTP Error ${response.status}`);
    }

    return result;
  }

  async request(method, url, payload = {}) {
    let lastError = null;
    for (const cipher of this.cipherSets) {
      try {
        return await this.makeRequest(method, url, payload, cipher);
      } catch (e) {
        lastError = e.message;
        console.warn(`Surepass ${method} cipher failed, trying next`, { cipher, error: lastError, url });
      }
    }
    throw new Error(`All ${method} attempts failed. Last: ${lastError}`);
  }

  curlPost(url, payload) { return this.request('POST', url, payload); }
  curlGet(url) { return this.request('GET', url); }

  /** Initialize DigiLocker session -> { client_id, url } */
  async initializeDigilocker(workerId) {
    const { User } = require('../models');
    const worker = await User.findByPk(workerId);

    const payload = {
      data: {
        prefill_options: {
          full_name: (worker && worker.name) || `Worker ${workerId}`,
          mobile_number: (worker && worker.phone) || '9999999999',
          user_email: (worker && worker.email) || 'worker@example.com',
        },
        expiry_minutes: 10,
        send_sms: false,
        send_email: false,
        verify_phone: false,
        verify_email: false,
        signup_flow: false,
        redirect_url: this.redirectUrl,
        state: `worker_${workerId}`,
      },
    };

    const result = await this.curlPost('https://sandbox.surepass.io/api/v1/digilocker/initialize', payload);

    if (!result || !result.data || !result.data.client_id || !result.data.url) {
      console.error('Surepass invalid initialize response', { result });
      throw new Error('Invalid response: ' + JSON.stringify(result));
    }

    console.log('DigiLocker initialized', { worker_id: workerId, client_id: result.data.client_id });

    return { client_id: result.data.client_id, url: result.data.url };
  }

  /** Fetch Aadhaar data (returns result.data) */
  async fetchAadhaarData(clientId) {
    const url = `https://sandbox.surepass.io/api/v1/digilocker/download-aadhaar/${clientId}`;
    const result = await this.curlGet(url);

    console.log('Surepass download-aadhaar response', { client_id: clientId, result });

    if (!result || !result.data || (typeof result.data === 'object' && !Object.keys(result.data).length)) {
      throw new Error('Aadhaar data empty: ' + JSON.stringify(result));
    }
    return result.data;
  }

  /** Check DigiLocker session status (returns full response) */
  async checkStatus(clientId) {
    const url = `https://sandbox.surepass.io/api/v1/digilocker/status/${clientId}`;
    const result = await this.curlGet(url);

    console.log('Surepass status check', { client_id: clientId, result });
    return result;
  }
}

module.exports = new SurepassService();
module.exports.SurepassService = SurepassService;
