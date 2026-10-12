// Port of App\Http\Controllers\Location\ServiceableAreaController
const { ServiceableArea, Zone, City } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { getScopedCityId } = require('../../utils/cityScoped');
const { createdJson, updatedJson } = require('../../utils/eloquent');
const CacheService = require('../../services/CacheService');

// ServiceableArea::$fillable
const FILLABLE = ['zone_id', 'name', 'pincode', 'latitude', 'longitude', 'status'];

async function validated(req, rules, messages) {
  const data = await validate(req, rules, messages);
  const all = req.all();
  for (const k of Object.keys(rules)) if (all[k] === null && !(k in data)) data[k] = null;
  return data;
}

async function forgetAreaCache(zoneId) {
  const zone = await Zone.findByPk(zoneId);
  if (zone) {
    CacheService.forgetAreas(zone.city_id);
  }
  CacheService.forget('hobit:areas:all');
}

module.exports = {
  async index(req, res) {
    const cityId = getScopedCityId(req);

    return res.json(await ServiceableArea.findAll({
      include: [{
        model: Zone,
        as: 'zone',
        required: !!cityId, // whereHas('zone', city_id = ?)
        where: cityId ? { city_id: cityId } : undefined,
        include: [{ model: City, as: 'city', required: false }],
      }],
    }));
  },

  async store(req, res) {
    await validate(req, {
      zone_id: 'required|exists:zones,id',
      name: 'required',
    });
    const all = req.all();
    const assigned = Object.fromEntries(Object.entries(all).filter(([k]) => FILLABLE.includes(k)));
    const area = await ServiceableArea.create(assigned);
    await forgetAreaCache(area.zone_id);
    return res.status(201).json(createdJson('ServiceableArea', area, assigned));
  },

  async show(req, res) {
    return res.json(await findOrFail(ServiceableArea, req.params.serviceable_area));
  },

  async update(req, res) {
    const area = await findOrFail(ServiceableArea, req.params.serviceable_area);
    const data = await validated(req, {
      zone_id: 'sometimes|exists:zones,id',
      name: 'sometimes|string',
      pincode: 'sometimes|nullable|string',
      latitude: 'sometimes|nullable|numeric|between:-90,90',
      longitude: 'sometimes|nullable|numeric|between:-180,180',
      status: 'sometimes|boolean',
    });
    await area.update(data);
    await forgetAreaCache(area.zone_id);
    return res.json(updatedJson('ServiceableArea', area, data));
  },

  async destroy(req, res) {
    const area = await findOrFail(ServiceableArea, req.params.serviceable_area);
    const zoneId = area.zone_id;
    await area.destroy();
    await forgetAreaCache(zoneId);
    return res.json({ message: 'Deleted' });
  },
};
