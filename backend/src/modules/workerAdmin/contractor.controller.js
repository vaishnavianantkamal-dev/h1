// Port of App\Http\Controllers\Api\Worker\ContractorController
const { Role, User, ServiceCategory, Service, Worker, WorkerAvailability, BookingRating, City, Zone, ServiceableArea } = require('../../models');
const { findOrFail } = require('../../utils/binding');

// Normalize IDs helper
function normalizeIds(value) {
  if (!value || (Array.isArray(value) && !value.length)) return [];
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (e) { value = null; }
  }
  if (Array.isArray(value) && Array.isArray(value[0])) value = value[0];
  if (!Array.isArray(value)) return [];
  return value.map((v) => parseInt(v, 10) || 0).filter(Boolean);
}

const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;

// Eloquent toArray() exposes the addedBy relation under the snake_case key "added_by"
function contractorToArray(contractor) {
  const data = contractor.toJSON();
  if ('addedBy' in data) {
    data.added_by = data.addedBy;
    delete data.addedBy;
  }
  return data;
}

const contractorIncludes = () => [
  { model: Role, as: 'role', required: false },
  { model: City, as: 'city', required: false },
  { model: Zone, as: 'zone', required: false },
  { model: ServiceableArea, as: 'area', required: false },
  { model: User, as: 'addedBy', required: false },
];

module.exports = {
  /**
   * List all contractors with full details (and workers_count).
   */
  async index(req, res) {
    const contractorRole = await Role.findOne({ where: { slug: 'contractors' }, attributes: ['id'] });
    const workerRole = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
    const contractorRoleId = contractorRole ? contractorRole.id : null;
    const workerRoleId = workerRole ? workerRole.id : null;

    // Get worker counts for all contractors who have referred workers
    const { Op, fn, col } = require('sequelize');
    const counts = await User.findAll({
      attributes: ['refer_by', [fn('COUNT', col('*')), 'total']],
      where: { refer_by: { [Op.ne]: null }, role_id: workerRoleId },
      group: ['refer_by'],
      raw: true,
    });
    const workerCounts = {};
    counts.forEach((r) => { workerCounts[r.refer_by] = Number(r.total); });

    // List contractors with workers_count
    const rows = await User.findAll({
      include: contractorIncludes(),
      where: { role_id: contractorRoleId },
      order: [['id', 'DESC']],
    });
    const contractors = rows.map((contractor) => {
      const data = contractorToArray(contractor);
      data.workers_count = workerCounts[contractor.id] ?? 0;
      return data;
    });

    return res.json({ success: true, data: contractors });
  },

  /**
   * Show contractor details and all workers referred by that contractor.
   */
  async show(req, res) {
    const contractor = await findOrFail(User, req.params.contractor, { include: contractorIncludes() });
    const workerRole = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
    const workerRoleId = workerRole ? workerRole.id : null;

    if (!contractor.role || contractor.role.slug !== 'contractors') {
      return res.status(400).json({ success: false, message: 'User is not a contractor' });
    }

    // Load workers REFERRED BY this contractor (not added_by)
    const workers = await User.findAll({
      include: [
        { model: Worker, as: 'worker', required: false },
        { model: WorkerAvailability, as: 'worker_availability', required: false },
        { model: BookingRating, as: 'ratings', required: false },
        { model: City, as: 'city', attributes: ['id', 'name'], required: false },
        { model: Zone, as: 'zone', attributes: ['id', 'name'], required: false },
        { model: ServiceableArea, as: 'area', attributes: ['id', 'name'], required: false },
        { model: Role, as: 'role', attributes: ['id', 'slug', 'name'], required: false },
        {
          model: User, as: 'referrer', required: false,
          attributes: ['id', 'name', 'public_id', 'phone', 'email', 'role_id', 'referral_code'],
          include: [{ model: Role, as: 'role', attributes: ['id', 'slug', 'name'], required: false }],
        },
      ],
      where: { role_id: workerRoleId, refer_by: contractor.id },
      order: [['id', 'DESC']],
    });

    // Preload category and service data
    let allCategoryIds = [];
    let allServiceIds = [];
    for (const w of workers) {
      allCategoryIds = allCategoryIds.concat(normalizeIds(w.toJSON().category_ids));
      allServiceIds = allServiceIds.concat(normalizeIds(w.toJSON().service_ids));
    }
    const categoriesMap = {};
    (await ServiceCategory.findAll({ where: { id: [...new Set(allCategoryIds)] }, attributes: ['id', 'name'] }))
      .forEach((c) => { categoriesMap[c.id] = c; });
    const servicesMap = {};
    (await Service.findAll({ where: { id: [...new Set(allServiceIds)] }, attributes: ['id', 'name'] }))
      .forEach((s) => { servicesMap[s.id] = s; });

    // Transform workers data
    const transformedWorkers = workers.map((worker) => {
      const wj = worker.toJSON(); // Eloquent-shaped attributes
      const workerData = worker.worker ? worker.worker.toJSON() : null;
      const categoryIds = normalizeIds(wj.category_ids);
      const serviceIds = normalizeIds(wj.service_ids);

      const ratings = worker.ratings || [];
      const ratingsAvg = ratings.length
        ? round1(ratings.reduce((s, r) => s + Number(r.rating), 0) / ratings.length)
        : 0;

      const categories = categoryIds.map((id) => categoriesMap[id] || null).filter(Boolean);
      const services = serviceIds.map((id) => servicesMap[id] || null).filter(Boolean);
      const ref = worker.referrer;

      return {
        id: worker.id,
        worker_id: workerData ? workerData.id : null,
        public_id: worker.public_id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        is_active: wj.is_active,
        is_assigned: wj.is_assigned,

        referred_by_contractor: {
          contractor_id: contractor.id,
          contractor_public_id: contractor.public_id,
          contractor_name: contractor.name,
          contractor_phone: contractor.phone,
          contractor_email: contractor.email,
          contractor_referral_code: contractor.referral_code,
        },

        referral_info: {
          is_referred: worker.refer_by !== null && worker.refer_by !== undefined,
          refer_by_id: worker.refer_by,
          referred_by_type: worker.referred_by_type,
          referral_points: wj.referral_points ?? 0,
          source_type: 'Referred by Contractor',
          referrer: ref ? {
            id: ref.id,
            name: ref.name,
            public_id: ref.public_id,
            phone: ref.phone,
            email: ref.email,
            referral_code: ref.referral_code,
            role: ref.role ? { id: ref.role.id, slug: ref.role.slug, name: ref.role.name } : null,
          } : null,
        },

        categories,
        services,

        city: worker.city,
        zone: worker.zone,
        area: worker.area,

        wallet_balance: workerData ? workerData.wallet_balance : null,
        kyc_status: workerData ? workerData.kyc_status : null,

        ratings: { average: ratingsAvg, count: ratings.length },

        worker_availability: worker.worker_availability,
      };
    });

    // Full contractor relations were loaded above
    const contractorData = contractorToArray(contractor);
    contractorData.workers_count = transformedWorkers.length;

    return res.json({
      success: true,
      data: { contractor: contractorData, workers: transformedWorkers },
    });
  },
};
