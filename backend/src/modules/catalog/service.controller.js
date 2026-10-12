// Port of App\Http\Controllers\Admin\ServiceController
const { Op, literal } = require('sequelize');
const sequelize = require('../../config/db');
const { Service, ServiceCategory, SubscriptionType, City, ServicePlan } = require('../../models');
const CacheService = require('../../services/CacheService');
const storage = require('../../utils/storage');
const { findOrFail } = require('../../utils/binding');
const { getScopedCityId } = require('../../utils/cityScoped');
const {
  validateEx, fileErrors, filesOf, hasFile, pick, asArray, toJSON, clone, pivotize, inMemory,
} = require('./support');

const FILLABLE = [
  'category_id', 'name', 'description', 'images', 'icons', 'duration_minutes', 'price', 'festival_price',
  'member_price', 'subscription_id', 'status', 'service_type', 'bhk_type', 'service_group', 'size_type', 'size_value',
];
const IMG = { mimes: ['jpeg', 'png', 'jpg', 'gif', 'webp'], maxKb: 2048 };

const baseInclude = () => [
  { model: ServiceCategory, as: 'category', required: false },
  { model: SubscriptionType, as: 'subscription', required: false },
  { model: SubscriptionType, as: 'subscriptions', required: false },
  { model: City, as: 'cities', required: false },
];

// serialise a Service row the way Eloquent does (belongsToMany join columns under `pivot`)
function serialise(row) {
  const j = toJSON(row);
  pivotize(j, 'subscriptions', 'service_subscription');
  pivotize(j, 'cities', 'city_service');
  return j;
}

const loadFull = async (id) => serialise(await Service.findByPk(id, { include: baseInclude() }));

// whereHas('cities', cities.id = ?) - keeps the full `cities` list loaded, like Eloquent
const cityFilter = (cityId) => (cityId
  ? { id: { [Op.in]: literal(`(SELECT service_id FROM city_service WHERE city_id = ${sequelize.escape(cityId)})`) } }
  : undefined);

// Transform image/icon paths AFTER cache so output is identical either way
function transformList(services) {
  return clone(services).map((service) => {
    service.icons = Array.isArray(service.icons) ? service.icons.map((i) => 'storage/app/public/' + i) : [];
    service.images = Array.isArray(service.images) ? service.images.map((i) => 'storage/app/public/' + i) : [];
    service.subscription_ids = (service.subscriptions || []).map((s) => s.id);
    return service;
  });
}

// Accept either the new `subscription_ids` array or the legacy single `subscription_id`.
function resolveSubscriptionIds(data) {
  let ids = data.subscription_ids ?? [];
  if (!ids.length && data.subscription_id && data.subscription_id !== '0') ids = [data.subscription_id];
  return [...new Set(ids.map((i) => parseInt(i, 10) || 0))];
}

// service lists (all cities) + category service menus
function clearServiceCaches() {
  CacheService.forgetServices();
  CacheService.forgetAllCategoryServices();
  CacheService.forgetCategories();
}

async function storeFiles(req, field) {
  return filesOf(req, field).map((f) => storage.storePublic(f, 'services'));
}

module.exports = {
  async index(req, res) {
    const cityId = getScopedCityId(req);

    const services = await CacheService.remember(
      CacheService.services(cityId),
      CacheService.TTL_1H,
      async () => {
        const rows = await Service.findAll({ include: baseInclude(), where: cityFilter(cityId) });
        return rows.map(serialise);
      },
    );

    res.json(transformList(services));
  },

  /**
   * List only services that have at least one period billing plan (service_plans), with their plans nested.
   */
  async withPlans(req, res) {
    const cityId = getScopedCityId(req);

    const services = await CacheService.remember(
      CacheService.servicesWithPlans(cityId),
      CacheService.TTL_1H,
      async () => {
        const rows = await Service.findAll({
          include: [{ model: ServicePlan, as: 'plans', required: true }, ...baseInclude()],
          where: cityFilter(cityId),
        });
        return rows.map(serialise);
      },
    );

    res.json(transformList(services));
  },

  async store(req, res) {
    const data = await validateEx(req, {
      category_id: 'required',
      name: 'required|string|max:255',
      description: 'nullable|string',
      duration_minutes: 'nullable|integer',
      price: 'required|numeric',
      festival_price: 'nullable|numeric',
      member_price: 'nullable|numeric',
      subscription_id: 'nullable|exists:subscription_type,id',
      subscription_ids: 'required_without:subscription_id|array',
      'subscription_ids.*': 'integer|exists:subscription_type,id',
      status: 'boolean',
      service_group: 'nullable|string|max:100',
      size_type: 'nullable|string|max:50',
      size_value: 'nullable|string|max:100',
      city_ids: 'nullable|array',
      'city_ids.*': 'integer|exists:cities,id',
    }, {
      'subscription_ids.required': 'The subscription ids field is required when subscription id is not present.',
    }, async (d, r) => ({ ...fileErrors(r, 'images', IMG), ...fileErrors(r, 'icons', IMG) }));

    // Normalise subscriptions: accept multiple ids, keep the single subscription_id column in sync.
    const subscriptionIds = resolveSubscriptionIds(data);
    data.subscription_id = subscriptionIds[0] ?? (data.subscription_id ?? null);
    delete data.subscription_ids;

    if (hasFile(req, 'images')) data.images = await storeFiles(req, 'images');
    if (hasFile(req, 'icons')) data.icons = await storeFiles(req, 'icons');

    const assigned = pick(data, FILLABLE);
    const service = await Service.create(assigned);

    await service.setSubscriptions(subscriptionIds);

    if (data.city_ids && data.city_ids.length) await service.setCities(data.city_ids);

    clearServiceCaches();

    const full = await loadFull(service.id);
    res.status(201).json({
      ...inMemory('Service', {}, assigned, service),
      category: full.category, subscription: full.subscription, subscriptions: full.subscriptions, cities: full.cities,
    });
  },

  async show(req, res) {
    const service = await findOrFail(Service, req.params.service, {
      include: [
        { model: ServiceCategory, as: 'category', required: false },
        { model: SubscriptionType, as: 'subscription', required: false },
        { model: SubscriptionType, as: 'subscriptions', required: false },
      ],
    });
    const j = serialise(service);
    j.subscription_ids = (j.subscriptions || []).map((s) => s.id);
    res.json(j);
  },

  async update(req, res) {
    const service = await findOrFail(Service, req.params.service);

    const data = await validateEx(req, {
      name: 'required|string|max:255',
      description: 'nullable|string',
      duration_minutes: 'nullable|integer',
      price: 'required|numeric',
      festival_price: 'nullable|numeric',
      member_price: 'nullable|numeric',
      subscription_id: 'nullable|exists:subscription_type,id',
      subscription_ids: 'nullable|array',
      'subscription_ids.*': 'integer|exists:subscription_type,id',
      status: 'boolean',
      service_group: 'nullable|string|max:100',
      size_type: 'nullable|string|max:50',
      size_value: 'nullable|string|max:100',
      city_ids: 'nullable|array',
      'city_ids.*': 'integer|exists:cities,id',
    }, {}, async (d, r) => fileErrors(r, 'images', IMG));

    // Only touch subscriptions when the caller actually sent them, so a partial update doesn't wipe existing links.
    const hasSubscriptions = req.has('subscription_ids') || req.has('subscription_id');
    const subscriptionIds = resolveSubscriptionIds(data);
    if (hasSubscriptions) data.subscription_id = subscriptionIds[0] ?? null;
    delete data.subscription_ids;

    if (hasFile(req, 'images')) data.images = await storeFiles(req, 'images');
    if (hasFile(req, 'icons')) data.icons = await storeFiles(req, 'icons');

    const base = toJSON(service);
    const assigned = pick(data, FILLABLE);
    await service.update(assigned);

    if (hasSubscriptions) await service.setSubscriptions(subscriptionIds);

    if (req.has('city_ids')) await service.setCities(data.city_ids ?? []);

    clearServiceCaches();

    const full = await loadFull(service.id);
    res.json({
      message: 'Service updated',
      service: {
        ...inMemory('Service', base, assigned, service),
        category: full.category, subscription: full.subscription, subscriptions: full.subscriptions, cities: full.cities,
      },
    });
  },

  async destroy(req, res) {
    const service = await findOrFail(Service, req.params.service);
    await service.destroy();
    clearServiceCaches();
    res.json({ message: 'Service deleted' });
  },
};
