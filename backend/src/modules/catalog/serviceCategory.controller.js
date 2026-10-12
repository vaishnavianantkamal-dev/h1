// Port of App\Http\Controllers\Admin\ServiceCategoryController
const { literal, Op } = require('sequelize');
const { ServiceCategory, SubscriptionType, Service } = require('../../models');
const CacheService = require('../../services/CacheService');
const paginate = require('../../utils/paginate');
const { findOrFail } = require('../../utils/binding');
const { validateEx, pick, asArray, toJSON, clone, pivotize, inMemory } = require('./support');

const FILLABLE = ['name', 'slug', 'icon', 'description', 'status'];

// withCount('services')
const servicesCount = [
  literal('(SELECT COUNT(*) FROM `services` WHERE `services`.`category_id` = `ServiceCategory`.`id`)'),
  'services_count',
];

const categoryRules = (extraSlugRule = '') => ({
  name: 'required|string|max:255',
  slug: `required|string|unique:service_categories,slug${extraSlugRule}`,
  icon: 'nullable|string',
  description: 'nullable|string',
  status: 'required|boolean',
  subscription_ids: 'nullable|array',
  'subscription_ids.*': 'integer|exists:subscription_type,id',
});

const prefixed = (list) => asArray(list).map((p) => 'storage/app/public/' + p);

module.exports = {
  async index(req, res) {
    const rows = await ServiceCategory.findAll({
      attributes: { include: [servicesCount] },
      include: [{ model: SubscriptionType, as: 'subscriptions' }],
    });
    res.json(rows.map((c) => {
      const j = toJSON(c);
      pivotize(j, 'subscriptions', 'category_subscription');
      j.subscription_ids = (j.subscriptions || []).map((s) => s.id);
      return j;
    }));
  },

  async store(req, res) {
    const data = await validateEx(req, categoryRules());
    const subscriptionIds = data.subscription_ids ?? [];
    delete data.subscription_ids;

    const assigned = pick(data, FILLABLE);
    const category = await ServiceCategory.create(assigned);
    await category.setSubscriptions(subscriptionIds);

    CacheService.forgetCategories();
    const loaded = await ServiceCategory.findByPk(category.id, { include: [{ model: SubscriptionType, as: 'subscriptions' }] });
    const j = toJSON(loaded);
    pivotize(j, 'subscriptions', 'category_subscription');
    res.status(201).json({ ...inMemory('ServiceCategory', {}, assigned, category), subscriptions: j.subscriptions });
  },

  async show(req, res) {
    const serviceCategory = await findOrFail(ServiceCategory, req.params.service_category, {
      include: [
        // `$service->subscription` is lazily loaded by the grouped-services block below in PHP
        { model: Service, as: 'services', include: [{ model: SubscriptionType, as: 'subscription', required: false }] },
        { model: SubscriptionType, as: 'subscriptions' },
      ],
    });
    const cat = toJSON(serviceCategory);
    pivotize(cat, 'subscriptions', 'category_subscription');

    const timeSlots = ['09:00 AM - 12:00 PM', '12:00 PM - 03:00 PM', '03:00 PM - 06:00 PM'];

    const services = (cat.services || []).map((s) => {
      s.icons = prefixed(s.icons);
      s.images = prefixed(s.images);
      // Only services in a group had their `subscription` relation lazily loaded in PHP
      if (s.service_group === null || s.service_group === undefined) delete s.subscription;
      return s;
    });

    // groupBy('service_group') on services whose service_group is not null (insertion order kept)
    const groups = new Map();
    services.filter((s) => s.service_group !== null && s.service_group !== undefined).forEach((s) => {
      if (!groups.has(s.service_group)) groups.set(s.service_group, []);
      groups.get(s.service_group).push(s);
    });
    const groupedServices = [...groups.entries()].map(([groupName, items]) => {
      const first = items[0];
      return {
        name: first.name,
        service_group: groupName,
        icons: first.icons,
        variants: items.map((s) => ({
          id: s.id,
          label: `${s.size_value ?? ''} ${s.size_type ?? ''}`.trim(),
          price: s.festival_price ?? s.price,
          description: s.description,
          subscription_id: s.subscription_id,
          subscription_name: s.subscription ?? null,
          status: Number(s.status) === 1 || s.status === true ? '1' : '0',
        })),
      };
    });

    res.json({
      services: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        subscriptions: cat.subscriptions,
        subscription_ids: (cat.subscriptions || []).map((s) => s.id),
        timeslot: timeSlots,
        services,
        grouped_services: groupedServices,
      },
    });
  },

  async update(req, res) {
    const serviceCategory = await findOrFail(ServiceCategory, req.params.service_category);
    const data = await validateEx(req, categoryRules(',' + serviceCategory.id));

    const hasSubscriptions = Object.prototype.hasOwnProperty.call(data, 'subscription_ids');
    const subscriptionIds = data.subscription_ids ?? [];
    delete data.subscription_ids;

    await serviceCategory.update(pick(data, FILLABLE));

    // Only sync when the field was sent, so other updates don't wipe links.
    if (hasSubscriptions) await serviceCategory.setSubscriptions(subscriptionIds);

    CacheService.forgetCategories();
    res.json({ message: 'Category updated' });
  },

  async destroy(req, res) {
    const serviceCategory = await findOrFail(ServiceCategory, req.params.service_category);
    await serviceCategory.destroy();
    CacheService.forgetCategories();
    res.json({ message: 'Category deleted' });
  },

  async allCategoriesWithServiceNames(req, res) {
    const categories = await CacheService.remember(
      CacheService.categoriesWithServiceNames(),
      CacheService.TTL_1H,
      async () => {
        const rows = await ServiceCategory.findAll({
          include: [{ model: Service, as: 'services', attributes: ['id', 'name', 'price', 'category_id'], required: false }],
        });
        return rows.map((category) => {
          const services = category.services || [];
          const names = [...new Set(services.map((s) => s.name))];
          // Collection::min('price') returns the raw column value (decimal string), compared numerically
          const prices = services.map((s) => s.price).filter((v) => v !== null && v !== undefined);
          let minPrice = null;
          for (const v of prices) if (minPrice === null || Number(v) < Number(minPrice)) minPrice = v;
          return {
            category: category.name,
            id: category.id,
            services: names,
            min_price: minPrice === null ? null : (typeof minPrice === 'number' ? minPrice.toFixed(2) : minPrice),
          };
        });
      },
    );
    res.json(clone(categories));
  },

  async getCategoriesBySubscription(req, res) {
    const subscription = await findOrFail(SubscriptionType, req.params.subscriptionId);
    const categories = await subscription.getCategories({
      attributes: { include: [servicesCount] },
      order: [['id', 'ASC']],
    });
    res.json({
      subscription_id: subscription.id,
      subscription_name: subscription.name,
      categories: categories.map((c) => pivotize({ x: [toJSON(c)] }, 'x', 'category_subscription').x[0]),
    });
  },

  async getCategoryServices(req, res) {
    // paginate($perPage): falsy -> model default (15); non-numeric / <= 0 blows up in PHP (500); fractions are truncated
    let lastPerPage;
    let perPage = req.input('per_page', 10); // default 10 per page
    if (!perPage || perPage === '0') perPage = 15;
    else {
      const str = String(perPage).trim();
      if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(str)) throw new Error('Unsupported operand types: string * int');
      lastPerPage = Number(str); // LengthAwarePaginator computes last_page from the raw (possibly fractional) per-page
      perPage = Math.trunc(Number(str));
      if (!(perPage > 0)) throw new Error('per_page must be positive');
    }
    const cityId = req.input('city_id'); // optional: filter by city

    // Optional auth (route is public): members get member pricing, display only.
    const user = req.user || null;
    const isMember = user ? await user.isMember() : false;

    const category = await findOrFail(ServiceCategory, req.params.categoryId);

    const where = { category_id: category.id, status: 1 }; // only active
    if (cityId) {
      // whereHas('cities', cities.id = ?)
      where[Op.and] = [{
        id: { [Op.in]: literal(`(SELECT service_id FROM city_service WHERE city_id = ${Service.sequelize.escape(cityId)})`) },
      }];
    }

    const services = await paginate(Service, req, {
      perPage,
      lastPerPage,
      attributes: ['id', 'category_id', 'name', 'description', 'price', 'festival_price', 'member_price', 'status'],
      include: [{ model: SubscriptionType, as: 'subscriptions', attributes: ['id', 'name'], through: { attributes: [] }, required: false }],
      where,
      order: [['price', 'ASC']],
    });

    services.data = services.data.map((service) => ({
      id: service.id,
      category_id: service.category_id,
      name: service.name,
      description: service.description,
      status: service.status,
      price: parseFloat(service.price),
      member_price: service.member_price !== null && service.member_price !== undefined
        ? parseFloat(service.member_price)
        : parseFloat(service.price),
      festival_price: service.festival_price !== null && service.festival_price !== undefined
        ? parseFloat(service.festival_price)
        : null,
      subscription_ids: (service.subscriptions || []).map((s) => s.id),
      subscriptions: (service.subscriptions || []).map((s) => ({ id: s.id, name: s.name })),
    }));

    res.json({
      category_id: category.id,
      category_name: category.name,
      is_member: isMember,
      services,
    });
  },
};
