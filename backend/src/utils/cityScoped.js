// Port of App\Http\Traits\CityScoped. Pass the express `req` (req.user must be loaded by auth/optionalAuth).
//   const cityId = getScopedCityId(req);   // number | null (null = all cities)
const CITY_LOCKED_ROLES = ['co-ordinators', 'city-admin'];

const roleSlug = (req) => (req.user && req.user.role && req.user.role.slug) || null;

// - city-admin / co-ordinators -> always their own city_id (cannot override)
// - super-admin / others       -> optional ?city_id= filter from the request
// - otherwise                  -> null (all cities)
function getScopedCityId(req) {
  const user = req.user || null;
  if (CITY_LOCKED_ROLES.includes(roleSlug(req)) && user && user.city_id) return Number(user.city_id);
  if (req.filled('city_id')) return Number(req.input('city_id'));
  return null;
}

const isSuperAdmin = (req) => roleSlug(req) === 'super-admin';
const isCityLocked = (req) => CITY_LOCKED_ROLES.includes(roleSlug(req));

module.exports = { getScopedCityId, isSuperAdmin, isCityLocked, CITY_LOCKED_ROLES };
