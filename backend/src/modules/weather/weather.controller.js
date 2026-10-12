// Port of app/Http/Controllers/WeatherController.php
const validate = require('../../utils/validate');
const weather = require('../../services/WeatherService');

const v = typeof validate === 'function' ? validate : validate.validate;

module.exports = {
  /** GET /api/weather/current   Query: location, aqi (0|1) */
  async current(req, res) {
    const validated = await v(req, {
      location: 'nullable|string|max:100',
      aqi: 'nullable|boolean',
    });

    try {
      const data = await weather.current(
        validated.location ?? null,
        [true, 1, '1', 'true'].includes(validated.aqi)
      );

      return res.json({ status: true, message: 'Current weather fetched successfully', data });
    } catch (e) {
      return res.status(422).json({ status: false, message: e.message });
    }
  },

  /** GET /api/weather/condition - decision-ready label (rainy / hot / etc.) + season */
  async condition(req, res) {
    const validated = await v(req, { location: 'nullable|string|max:100' });

    try {
      const current = await weather.current(validated.location ?? null);
      const classified = weather.classify(current);

      // Configured surcharge - shown only while it is raining so the cart can render a "Rain charge" line.
      const { Setting } = require('../../models');
      const rainCharge = Number(await Setting.get('rain_charge', 0)) || 0;

      return res.json({
        status: true,
        message: 'Weather condition resolved successfully',
        data: {
          ...classified,
          rain_charge: classified.is_raining ? rainCharge : 0.0,
          show_rain_animation: !!classified.is_raining,
        },
      });
    } catch (e) {
      return res.status(422).json({ status: false, message: e.message });
    }
  },
};
