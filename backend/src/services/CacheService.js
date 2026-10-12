// Port of app/Services/CacheService.php - central cache key registry + invalidation.
// Laravel's Cache facade is replaced by a process-local in-memory TTL map.
const store = new Map(); // key -> { value, expires (ms epoch | null) }

const TTL_24H = 86400;
const TTL_1H = 3600;
const TTL_30M = 1800;
const TTL_5M = 300;
const TTL_2M = 120;

// ── Cache facade replacement ─────────────────────────────────────────────────
const MISS = Symbol('miss');
function get(key, ...rest) {
  const def = rest.length ? rest[0] : null; // explicit `undefined` must stay undefined (remember/has rely on it)
  const e = store.get(key);
  if (!e) return def;
  if (e.expires !== null && e.expires <= Date.now()) {
    store.delete(key);
    return def;
  }
  return e.value;
}
function has(key) { return get(key, MISS) !== MISS; }
function put(key, value, ttlSeconds = null) {
  store.set(key, { value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
  return true;
}
// Cache::remember($key, $ttl, $fn) - $fn may be async
async function remember(key, ttlSeconds, fn) {
  const hit = get(key, MISS);
  if (hit !== MISS) return hit;
  const value = await fn();
  put(key, value, ttlSeconds);
  return value;
}
function forget(key) { return store.delete(key); }
function forgetByPrefix(prefix) {
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}
function flush() { store.clear(); }

// ── KEY BUILDERS ─────────────────────────────────────────────────────────────
const cities = () => 'hobit:cities:all';
const zones = (cityId) => `hobit:zones:city:${cityId}`;
const areas = (cityId) => `hobit:areas:city:${cityId}`;
const services = (cityId = null) => 'hobit:services:city:' + (cityId ?? 'all');
const servicesWithPlans = (cityId = null) => 'hobit:services_with_plans:city:' + (cityId ?? 'all');
const categories = () => 'hobit:categories:all';
const homeCategories = () => 'hobit:home_categories:all';
const homeCategoryDetail = (categoryId) => `hobit:home_categories:detail:${categoryId}`;
const marquee = () => 'hobit:marquee:all';
const categoryWithServices = (categoryId) => `hobit:category:services:${categoryId}`;
const categoriesWithServiceNames = () => 'hobit:categories:with_service_names';
const subscriptionTypes = () => 'hobit:subscription_types:all';
const addons = () => 'hobit:addons:all';
const pincodeCheck = (pincode, cityId = null) => 'hobit:pincode:' + pincode + ':' + (cityId ?? 'any');
const dashboardCounts = (cityId = null) => 'hobit:dashboard:counts:' + (cityId ?? 'all');
const completedMonthly = (cityId, fromMonth, toMonth, dateField) =>
  'hobit:dashboard:completed-monthly:' + (cityId ?? 'all') + ':' + fromMonth + ':' + toMonth + ':' + dateField;

// ── INVALIDATION HELPERS (synchronous; prefix-based so no City/Category lookups are needed) ──
const forgetCities = () => forget(cities());
const forgetZones = (cityId) => forget(zones(cityId));
const forgetAreas = (cityId) => forget(areas(cityId));
const forgetServices = () => {
  forgetByPrefix('hobit:services:city:');
  forgetByPrefix('hobit:services_with_plans:city:');
};
const forgetCategories = () => forget(categories());
const forgetHomeCategories = () => {
  forget(homeCategories());
  forgetByPrefix('hobit:home_categories:detail:');
};
const forgetMarquee = () => forget(marquee());
const forgetCategoryWithServices = (categoryId) => forget(categoryWithServices(categoryId));
const forgetAllCategoryServices = () => {
  forgetByPrefix('hobit:category:services:');
  forget(categoriesWithServiceNames());
};
const forgetSubscriptionTypes = () => forget(subscriptionTypes());
const forgetAddons = () => forget(addons());
const forgetDashboardCounts = () => {
  forgetByPrefix('hobit:dashboard:counts:');
};
const forgetPincodeCheck = (pincode) => {
  forgetByPrefix('hobit:pincode:' + pincode + ':');
};

module.exports = {
  TTL_24H, TTL_1H, TTL_30M, TTL_5M, TTL_2M,
  get, has, put, remember, forget, forgetByPrefix, flush,
  cities, zones, areas, services, servicesWithPlans, categories, homeCategories, homeCategoryDetail,
  marquee, categoryWithServices, categoriesWithServiceNames, subscriptionTypes, addons,
  pincodeCheck, dashboardCounts, completedMonthly,
  forgetCities, forgetZones, forgetAreas, forgetServices, forgetCategories, forgetHomeCategories,
  forgetMarquee, forgetCategoryWithServices, forgetAllCategoryServices, forgetSubscriptionTypes,
  forgetAddons, forgetDashboardCounts, forgetPincodeCheck,
};
