// Ports of App\Http\Resources\BannerResource and InstantHelpCardResource.
// `asset(Storage::url($path))` == APP_URL/storage/<path>
const { storageUrl } = require('../../utils/storage');

const bannerResource = (b) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  // Full absolute URL - app can load it directly.
  image_url: b.image ? storageUrl(b.image) : null,
  placement: b.placement,
  // The generic tap-instruction the app acts on.
  action_type: b.action_type,
  action_value: b.action_value,
  sort_order: b.sort_order,
  is_active: b.is_active,
  start_date: b.start_date,
  end_date: b.end_date,
  start_time: b.start_time,
  end_time: b.end_time,
  audience: b.audience,
});

const instantHelpCardResource = (c) => ({
  id: c.id,
  title: c.title,
  subtitle: c.subtitle,
  // Full absolute URL - app can load it directly.
  image_url: c.image ? storageUrl(c.image) : null,
  // The generic tap-instruction the app acts on.
  action_type: c.action_type,
  action_value: c.action_value,
  is_active: c.is_active,
  start_date: c.start_date,
  end_date: c.end_date,
  trigger_type: c.trigger_type,
  start_hour: c.start_hour,
  end_hour: c.end_hour,
  priority: c.priority,
});

const collection = (fn) => (rows) => rows.map(fn);

module.exports = {
  bannerResource,
  bannerCollection: collection(bannerResource),
  instantHelpCardResource,
  instantHelpCardCollection: collection(instantHelpCardResource),
};
