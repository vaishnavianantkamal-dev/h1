// Port of App\Http\Controllers\Location\ZoneController
const { Zone, City } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { getScopedCityId } = require('../../utils/cityScoped');
const { createdJson, updatedJson } = require('../../utils/eloquent');
const CacheService = require('../../services/CacheService');

async function validated(req, rules, messages) {
  const data = await validate(req, rules, messages);
  const all = req.all();
  for (const k of Object.keys(rules)) if (all[k] === null && !(k in data)) data[k] = null;
  return data;
}

module.exports = {
  async index(req, res) {
    const cityId = getScopedCityId(req);

    return res.json(await Zone.findAll({
      where: cityId ? { city_id: cityId } : undefined,
      include: [{ model: City, as: 'city', required: false }],
    }));
  },

  async store(req, res) {
    await validate(req, {
      city_id: 'required|exists:cities,id',
      name: 'required',
    });
    const assigned = req.only('city_id', 'name', 'status');
    const zone = await Zone.create(assigned);
    CacheService.forgetZones(zone.city_id);
    return res.status(201).json(createdJson('Zone', zone, assigned));
  },

  async show(req, res) {
    return res.json(await findOrFail(Zone, req.params.zone));
  },

  async update(req, res) {
    const zone = await findOrFail(Zone, req.params.zone);
    const data = await validated(req, {
      city_id: 'sometimes|exists:cities,id',
      name: 'sometimes|string',
    });
    await zone.update(data);
    CacheService.forgetZones(zone.city_id);
    return res.json(updatedJson('Zone', zone, data));
  },

  async destroy(req, res) {
    const zone = await findOrFail(Zone, req.params.zone);
    const cityId = zone.city_id;
    await zone.destroy();
    CacheService.forgetZones(cityId);
    return res.json({ message: 'Deleted' });
  },
};
