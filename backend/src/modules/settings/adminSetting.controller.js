// Port of App\Http\Controllers\Admin\AdminSettingController
const { Setting } = require('../../models');
const { validateEx, toFloat, toInt } = require('../catalog/support');

module.exports = {
  async index(req, res) {
    const settings = await Setting.findAll({ attributes: ['key', 'value', 'description'] });
    res.json({ success: true, settings });
  },

  async updateReferralPoints(req, res) {
    const data = await validateEx(req, { points: 'required|integer|min:0' });

    await Setting.set(
      'referral_points_per_referral',
      String(data.points === true ? 1 : data.points),
      'Points awarded to referrer for each successful referral',
    );

    res.json({
      success: true,
      message: 'Referral points updated successfully',
      points: data.points,
    });
  },

  /**
   * PUT /admin/settings/closing-time
   * Latest time a service must FINISH by.   { "closing_time": "18:00" }   // HH:mm (24h)
   */
  async updateClosingTime(req, res) {
    const data = await validateEx(req, { closing_time: 'required|date_format:H:i' });

    await Setting.set('business_closing_time', data.closing_time, 'Latest time (HH:mm) a service must finish by');

    res.json({
      success: true,
      message: 'Closing time updated successfully',
      closing_time: data.closing_time,
    });
  },

  /**
   * PUT /admin/settings/charges
   *  { "platform_fee": 20, "travelling_charge": 0, "gst_percent": 18 }
   */
  async updateCharges(req, res) {
    const data = await validateEx(req, {
      platform_fee: 'required|numeric|min:0',
      travelling_charge: 'required|numeric|min:0',
      gst_percent: 'required|numeric|min:0|max:100',
      rain_charge: 'nullable|numeric|min:0',
      subscription_fee: 'nullable|numeric|min:0',
    });

    await Setting.set('platform_fee', String(data.platform_fee), 'Flat platform fee (₹) added to every web/app cart booking');
    await Setting.set('travelling_charge', String(data.travelling_charge), 'Flat travelling charge (₹) added to every web/app cart booking');
    await Setting.set('gst_percent', String(data.gst_percent), 'GST percentage applied on the item total (web/app cart booking)');

    // Rain charge is optional - leaving it out keeps the current value untouched.
    if (data.rain_charge !== undefined && data.rain_charge !== null) {
      await Setting.set('rain_charge', String(data.rain_charge), 'Flat extra charge (₹) added to an INSTANT booking when it is raining and the service starts within the next hour');
    }

    // Subscription fee is optional - leaving it out keeps the current value untouched.
    if (data.subscription_fee !== undefined && data.subscription_fee !== null) {
      await Setting.set('subscription_fee', String(data.subscription_fee), 'Flat subscription fee (₹) added to a web/app cart booking only when the customer is NOT a member');
    }

    res.json({
      success: true,
      message: 'Charges updated successfully',
      charges: {
        platform_fee: toFloat(data.platform_fee),
        travelling_charge: toFloat(data.travelling_charge),
        gst_percent: toFloat(data.gst_percent),
        rain_charge: toFloat(await Setting.get('rain_charge', 0)),
        subscription_fee: toFloat(await Setting.get('subscription_fee', 0)),
      },
    });
  },

  /**
   * PUT /admin/settings/extend
   *  { "extend_duration_minutes": 30, "extend_price": 200 }
   */
  async updateExtendSettings(req, res) {
    const data = await validateEx(req, {
      extend_duration_minutes: 'required|integer|min:1',
      extend_price: 'required|numeric|min:0',
    });

    await Setting.set('extend_duration_minutes', String(data.extend_duration_minutes), 'Minutes added per app/web service extension (new flow)');
    await Setting.set('extend_price', String(data.extend_price), 'Price (₹) per app/web service extension (new flow)');

    res.json({
      success: true,
      message: 'Extension settings updated successfully',
      extend: {
        extend_duration_minutes: toInt(data.extend_duration_minutes),
        extend_price: toFloat(data.extend_price),
      },
    });
  },

  /** GET /admin/settings/extend */
  async extendSettings(req, res) {
    res.json({
      success: true,
      extend: {
        extend_duration_minutes: toInt(await Setting.get('extend_duration_minutes', 0)),
        extend_price: toFloat(await Setting.get('extend_price', 0)),
      },
    });
  },

  /** GET /settings/charges (public) */
  async charges(req, res) {
    res.json({
      success: true,
      charges: {
        platform_fee: toFloat(await Setting.get('platform_fee', 0)),
        travelling_charge: toFloat(await Setting.get('travelling_charge', 0)),
        gst_percent: toFloat(await Setting.get('gst_percent', 0)),
        rain_charge: toFloat(await Setting.get('rain_charge', 0)),
        subscription_fee: toFloat(await Setting.get('subscription_fee', 0)),
      },
    });
  },

  /** GET /admin/settings/closing-time */
  async closingTime(req, res) {
    res.json({
      success: true,
      closing_time: await Setting.get('business_closing_time'),
    });
  },

  /** GET /admin/settings/referral-points */
  async referralPoints(req, res) {
    res.json({
      success: true,
      points: toInt(await Setting.get('referral_points_per_referral', 0)),
    });
  },
};
