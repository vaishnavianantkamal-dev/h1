// Port of App\Http\Controllers\Commission\CommissionController
const { Commission, Service } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');

const FILLABLE = ['service_id', 'commission_type', 'value', 'status'];
const pick = (obj) => Object.fromEntries(FILLABLE.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

module.exports = {
  async index(req, res) {
    return res.json(await Commission.findAll({ include: [{ model: Service, as: 'service', required: false }] }));
  },

  async store(req, res) {
    const data = await validate(req, {
      service_id: 'required|exists:services,id',
      commission_type: 'required|in:percentage,fixed',
      value: 'required|numeric',
      status: 'sometimes|in:active,inactive',
    });
    // returning a freshly created model => 201
    // Eloquent create() keeps only the assigned attributes (+ id and timestamps), not DB defaults like status
    const attrs = pick(data);
    const created = await Commission.create(attrs);
    const j = created.toJSON();
    return res.status(201).json({ ...attrs, updated_at: j.updated_at, created_at: j.created_at, id: created.id });
  },

  // GET /admin/commissions/:commission (the PHP controller had no show() - the route always returned 500)
  async show(req, res) {
    const commission = await findOrFail(Commission, req.params.commission, { include: [{ model: Service, as: 'service', required: false }] });
    return res.json(commission);
  },

  async update(req, res) {
    const commission = await findOrFail(Commission, req.params.commission);
    const data = await validate(req, {
      commission_type: 'sometimes|in:percentage,fixed',
      value: 'sometimes|numeric',
      status: 'sometimes|in:active,inactive',
    });
    await commission.update(pick(data));
    return res.json({ message: 'Commission rule updated' });
  },

  async destroy(req, res) {
    const commission = await findOrFail(Commission, req.params.commission);
    await commission.destroy();
    return res.json({ message: 'Commission rule deleted' });
  },
};
