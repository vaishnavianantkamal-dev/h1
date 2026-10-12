// Port of App\Http\Controllers\LiveTracking\LiveTrackingController
// NOTE: in Laravel this controller's route is commented out in routes/api.php, so no route is registered for it.
const { LiveLocation } = require('../../models');
const { validate } = require('../../utils/validate');

const generateTrackingLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

module.exports = {
  async updateLocation(req, res) {
    await validate(req, {
      order_id: 'required|exists:orders,id',
      latitude: 'required|numeric',
      longitude: 'required|numeric',
    });

    // LiveLocation::updateOrCreate(['order_id'=>..,'worker_id'=>auth()->id()], [...])
    const keys = { order_id: req.input('order_id'), worker_id: req.user ? req.user.id : null };
    const values = { latitude: req.input('latitude'), longitude: req.input('longitude'), updated_at: new Date() };
    let location = await LiveLocation.findOne({ where: keys });
    if (location) await location.update(values);
    else location = await LiveLocation.create({ ...keys, ...values });

    return res.json({ tracking_url: generateTrackingLink(location.latitude, location.longitude) });
  },
};
