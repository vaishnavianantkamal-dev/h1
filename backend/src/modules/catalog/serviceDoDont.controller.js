// Port of App\Http\Controllers\Api\ServiceDoDontController
const { Service, ServiceDoDont } = require('../../models');
const { findOrFail } = require('../../utils/binding');
const { validateEx, pick, toJSON, inMemory } = require('./support');

const FILLABLE = ['service_id', 'type', 'text', 'sort_order'];
const serviceInclude = () => [{ model: Service, as: 'service', required: false }];
const ORDER = [['sort_order', 'ASC'], ['id', 'ASC']];

module.exports = {
  /** List all do's and don'ts (admin) or by service */
  async index(req, res) {
    const where = {};
    if (req.filled('service_id')) where.service_id = req.input('service_id');

    const items = await ServiceDoDont.findAll({ where, include: serviceInclude(), order: ORDER });
    res.json({ success: true, data: items });
  },

  /** Public: get do's and don'ts for a service (no auth) */
  async byService(req, res) {
    const service = await findOrFail(Service, req.params.service);
    const items = await ServiceDoDont.findAll({ where: { service_id: service.id }, order: ORDER });

    res.json({
      success: true,
      data: {
        dos: items.filter((i) => i.type === 'do'),
        donts: items.filter((i) => i.type === 'dont'),
        all: items,
      },
    });
  },

  async store(req, res) {
    const validated = await validateEx(req, {
      service_id: ['required', 'integer', 'exists:services,id'],
      type: ['required', 'in:do,dont'],
      text: ['required', 'string', 'max:500'],
      sort_order: ['nullable', 'integer', 'min:0'],
    });

    const assigned = {
      service_id: validated.service_id,
      type: validated.type,
      text: validated.text,
      sort_order: validated.sort_order ?? 0,
    };
    const item = await ServiceDoDont.create(assigned);

    res.status(201).json({ success: true, message: 'Do/Dont added successfully', data: inMemory('ServiceDoDont', {}, assigned, item) });
  },

  async show(req, res) {
    const item = await findOrFail(ServiceDoDont, req.params.serviceDoDont, { include: serviceInclude() });
    res.json({ success: true, data: toJSON(item) });
  },

  async update(req, res) {
    const item = await findOrFail(ServiceDoDont, req.params.serviceDoDont);
    const validated = await validateEx(req, {
      service_id: ['sometimes', 'integer', 'exists:services,id'],
      type: ['sometimes', 'in:do,dont'],
      text: ['sometimes', 'string', 'max:500'],
      sort_order: ['nullable', 'integer', 'min:0'],
    });

    const base = toJSON(item);
    const assigned = pick(validated, FILLABLE);
    await item.update(assigned);

    res.json({ success: true, message: 'Do/Dont updated successfully', data: inMemory('ServiceDoDont', base, assigned, item) });
  },

  async destroy(req, res) {
    const item = await findOrFail(ServiceDoDont, req.params.serviceDoDont);
    await item.destroy();
    res.json({ success: true, message: 'Do/Dont deleted successfully' });
  },
};
