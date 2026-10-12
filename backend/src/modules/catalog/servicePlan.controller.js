// Port of App\Http\Controllers\Admin\ServicePlanController
// Admin CRUD for a service's billing plans (15 Days / 1 Month ...), nested under /services/:service/plans.
const { Service, ServicePlan } = require('../../models');
const { abort } = require('../../utils/errors');
const { findOrFail } = require('../../utils/binding');
const { validateEx, pick, same } = require('./support');

const FILLABLE = ['service_id', 'name', 'duration_days', 'price', 'festival_price', 'member_price'];

// member_price / festival_price are optional; when omitted the resolver falls back to price.
const validateData = (req) => validateEx(req, {
  name: ['required', 'string', 'max:255'],
  duration_days: ['required', 'integer', 'min:1'],
  price: ['required', 'numeric', 'min:0'],
  festival_price: ['nullable', 'numeric', 'min:0'],
  member_price: ['nullable', 'numeric', 'min:0'],
});

// Guard against /services/{A}/plans/{planOfB} mismatches.
const ensureBelongs = (service, plan) => {
  if (!same(plan.service_id, service.id)) abort(404, 'Plan not found for this service.');
};

module.exports = {
  /** GET /services/{service}/plans */
  async index(req, res) {
    const service = await findOrFail(Service, req.params.service);
    const plans = await ServicePlan.findAll({ where: { service_id: service.id }, order: [['duration_days', 'ASC']] });
    res.json({ success: true, data: plans });
  },

  /** POST /services/{service}/plans */
  async store(req, res) {
    const service = await findOrFail(Service, req.params.service);
    const data = await validateData(req);
    const plan = await ServicePlan.create(pick({ ...data, service_id: service.id }, FILLABLE));
    res.status(201).json({ success: true, message: 'Plan created successfully.', data: plan });
  },

  /** GET /services/{service}/plans/{plan} */
  async show(req, res) {
    const service = await findOrFail(Service, req.params.service);
    const plan = await findOrFail(ServicePlan, req.params.plan);
    ensureBelongs(service, plan);
    res.json({ success: true, data: plan });
  },

  /** PUT/PATCH /services/{service}/plans/{plan} */
  async update(req, res) {
    const service = await findOrFail(Service, req.params.service);
    const plan = await findOrFail(ServicePlan, req.params.plan);
    ensureBelongs(service, plan);

    await plan.update(pick(await validateData(req), FILLABLE));

    res.json({
      success: true,
      message: 'Plan updated successfully.',
      data: await ServicePlan.findByPk(plan.id),
    });
  },

  /** DELETE /services/{service}/plans/{plan} */
  async destroy(req, res) {
    const service = await findOrFail(Service, req.params.service);
    const plan = await findOrFail(ServicePlan, req.params.plan);
    ensureBelongs(service, plan);
    await plan.destroy();
    res.json({ success: true, message: 'Plan deleted successfully.' });
  },
};
