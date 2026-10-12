// Port of app/Services/WeatherService.php - Weather Union (weatherunion.com) integration.
// current() returns the WeatherAPI.com-style shape (top-level `current` object) so classify()/isRaining()/
// the controller and the mobile app work unchanged. Responses are cached briefly (config.weather.cacheTtl).
const axios = require('axios');
const config = require('../config');
const CacheService = require('./CacheService');
const { dayjs } = require('../utils/time');

// Secondary rain signal; rain detection is driven off precip_mm (mapped from rain_intensity).
const RAIN_CODES = [1063, 1150, 1180, 1183, 1186, 1189, 1192, 1195];

const numOrNull = (v) => (v !== null && v !== undefined && v !== '' && !isNaN(Number(v)) && typeof v !== 'boolean' ? Number(v) : null);
const isNumeric = (v) => numOrNull(v) !== null;

class WeatherService {
  get key() { return String(config.weather.apiKey || ''); }
  get baseUrl() { return String(config.weather.baseUrl || '').replace(/\/+$/, ''); }
  get ttl() { return parseInt(config.weather.cacheTtl, 10) || 0; }
  get timeout() { return parseInt(config.weather.timeout, 10) || 10; }

  /** Current weather. location = "lat,lon" (falls back to config default). aqi accepted + ignored. */
  async current(location = null, aqi = false) {
    location = this.resolveLocation(location);

    return this.cached(`current:${location}`, async () => {
      const [lat, lon] = this.parseCoords(location);
      const raw = await this.request('get_weather_data', { latitude: lat, longitude: lon });
      return this.normalize(raw, lat, lon);
    });
  }

  /**
   * Turn a normalised current-weather response into a simple label.
   * Returns { is_raining, temp_c, temp_band, season, label, condition }.
   * @param {object} current result of current()
   * @param {number|null} month 1-12 (defaults to now)
   */
  classify(current, month = null) {
    const cur = (current && current.current) || {};
    // temp_c may be null when the station's sensor is not reporting - keep null (not "cold").
    const tempRaw = cur.temp_c === undefined ? null : cur.temp_c;
    const tempC = isNumeric(tempRaw) ? Number(tempRaw) : null;
    const precip = Number(cur.precip_mm || 0) || 0;
    const code = parseInt((cur.condition && cur.condition.code) || 0, 10) || 0;
    const text = String((cur.condition && cur.condition.text) || '');

    const isRaining = precip > 0 || RAIN_CODES.includes(code);

    let tempBand;
    if (tempC === null) tempBand = 'unknown';
    else if (tempC >= 35) tempBand = 'hot';
    else if (tempC >= 28) tempBand = 'warm';
    else if (tempC >= 20) tempBand = 'pleasant';
    else if (tempC >= 15) tempBand = 'cool';
    else tempBand = 'cold';

    month = month === null || month === undefined ? dayjs().month() + 1 : month;
    let season;
    if (month >= 3 && month <= 5) season = 'summer'; // Mar-May
    else if (month >= 6 && month <= 9) season = 'monsoon'; // Jun-Sep
    else season = 'winter'; // Oct-Feb

    return {
      is_raining: isRaining,
      temp_c: tempC,
      temp_band: tempBand,
      season,
      label: isRaining ? 'rainy' : tempBand,
      condition: text,
    };
  }

  /** SAFE: returns false if the weather lookup fails for any reason. */
  async isRaining(location = null) {
    try {
      return !!this.classify(await this.current(location)).is_raining;
    } catch (e) {
      console.warn('isRaining check failed - treating as NOT raining', { location, error: e.message });
      return false;
    }
  }

  // ── INTERNALS ──
  resolveLocation(location) {
    location = String(location === null || location === undefined ? '' : location).trim();
    return location !== '' ? location : String(config.weather.defaultLocation);
  }

  parseCoords(location) {
    const parts = location.split(',').map((s) => s.trim());
    if (parts.length === 2 && isNumeric(parts[0]) && isNumeric(parts[1])) {
      return [Number(parts[0]), Number(parts[1])];
    }

    // Not coordinates (e.g. a city name) - fall back to default coordinates.
    const def = String(config.weather.defaultLocation).split(',').map((s) => s.trim());
    const lat = def[0] !== undefined && isNumeric(def[0]) ? Number(def[0]) : 18.5204;
    const lon = def[1] !== undefined && isNumeric(def[1]) ? Number(def[1]) : 73.8567;

    console.log('Weather location was not coordinates - using default', { given: location, used: `${lat},${lon}` });
    return [lat, lon];
  }

  normalize(raw, lat, lon) {
    const w = (raw && raw.locality_weather_data) || {};

    const tempC = numOrNull(w.temperature);
    const humid = numOrNull(w.humidity);
    const windDir = numOrNull(w.wind_direction);
    const windSpd = numOrNull(w.wind_speed);

    // rain_intensity is the live "raining RIGHT NOW" rate; rain_accumulation must not drive the charge.
    const rainNow = numOrNull(w.rain_intensity) ?? 0.0;
    const rainAccum = numOrNull(w.rain_accumulation) ?? 0.0;
    const precip = rainNow;
    const isRaining = precip > 0;

    return {
      location: { name: `${lat},${lon}`, lat, lon },
      current: {
        temp_c: tempC,
        humidity: humid,
        wind_kph: windSpd,
        wind_degree: windDir,
        precip_mm: precip,
        rain_accumulation: rainAccum,
        condition: { text: isRaining ? 'Rain' : 'Clear', code: isRaining ? 1063 : 1000 },
      },
      source: 'weatherunion',
      raw: w,
    };
  }

  async cached(suffix, fetch) {
    if (this.ttl <= 0) return fetch();
    return CacheService.remember(`hobit:weather:${suffix}`, this.ttl, fetch);
  }

  /** Perform the Weather Union API call and normalise errors. Throws Error on failure. */
  async request(endpoint, query) {
    if (this.key === '') {
      throw new Error('Weather Union key is not configured (set WEATHERUNION_API_KEY).');
    }

    let response;
    try {
      response = await axios.get(`${this.baseUrl}/${endpoint}`, {
        params: query,
        timeout: this.timeout * 1000,
        headers: { 'x-zomato-api-key': this.key },
        validateStatus: () => true,
      });
    } catch (e) {
      console.error('Weather Union request failed', { endpoint, error: e.message });
      throw new Error('Unable to reach weather service.');
    }

    const data = response.data && typeof response.data === 'object' ? response.data : {};
    const failed = response.status >= 400;
    // Weather Union returns HTTP 200 with { status: "200", message: "", locality_weather_data: {...} } on success.
    const ok = !failed && data.locality_weather_data !== undefined && data.locality_weather_data !== null;

    if (!ok) {
      const message = (data.message ?? '') !== ''
        ? data.message
        : `Weather Union error (HTTP ${response.status}, status=${data.status})`;
      console.warn('Weather Union error response', { endpoint, query, http: response.status, status: data.status ?? null, message });
      throw new Error(message);
    }

    return data;
  }
}

module.exports = new WeatherService();
module.exports.WeatherService = WeatherService;
