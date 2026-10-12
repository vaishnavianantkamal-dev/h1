// Port of App\Http\Controllers\Admin\ExtraTimeFeeController
const { ExtraTimeFee, Service } = require('../../models');
const { findOrFail } = require('../../utils/binding');
const { validateEx, pick, inMemory } = require('./support');

const FILLABLE = ['service_id', 'minutes', 'fee', 'festival_fee', 'is_active'];

module.exports = {
  async index(req, res) {
    res.json(await ExtraTimeFee.findAll({ include: [{ model: Service, as: 'service', required: false }] }));
  },

  async store(req, res) {
    const data = await validateEx(req, {
      service_id: 'required|exists:services,id',
      minutes: 'required|integer',
      fee: 'required|numeric',
      festival_fee: 'nullable|numeric',
      is_active: 'boolean',
    });
    const assigned = pick(data, FILLABLE);
    const fee = await ExtraTimeFee.create(assigned);
    res.status(201).json(inMemory('ExtraTimeFee', {}, assigned, fee));
  },

  async update(req, res) {
    const extraTimeFee = await findOrFail(ExtraTimeFee, req.params.extra_time_fee);
    const data = await validateEx(req, {
      minutes: 'required|integer',
      fee: 'required|numeric',
      festival_fee: 'nullable|numeric',
      is_active: 'boolean',
    });
    await extraTimeFee.update(pick(data, FILLABLE));
    res.json({ message: 'Extra time fee updated' });
  },

  async destroy(req, res) {
    const extraTimeFee = await findOrFail(ExtraTimeFee, req.params.extra_time_fee);
    await extraTimeFee.destroy();
    res.json({ message: 'Extra time fee deleted' });
  },
};
