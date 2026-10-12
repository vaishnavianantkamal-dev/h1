// Port of App\Http\Controllers\Location\CityController
const { literal } = require('sequelize');
const { City } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { createdJson, updatedJson } = require('../../utils/eloquent');
const CacheService = require('../../services/CacheService');

// Laravel returns present-but-null validated keys as well; the shared validate() skips them
async function validated(req, rules, messages) {
  const data = await validate(req, rules, messages);
  const all = req.all();
  for (const k of Object.keys(rules)) if (all[k] === null && !(k in data)) data[k] = null;
  return data;
}

module.exports = {
  async index(req, res) {
    // City::withCount('zones')
    return res.json(await City.findAll({
      attributes: { include: [[literal('(SELECT COUNT(*) FROM `zones` WHERE `zones`.`city_id` = `City`.`id`)'), 'zones_count']] },
    }));
  },

  async store(req, res) {
    await validate(req, { name: 'required|unique:cities,name' });
    const assigned = req.only('name', 'status');
    const city = await City.create(assigned);
    CacheService.forgetCities();
    return res.status(201).json(createdJson('City', city, assigned));
  },

  async show(req, res) {
    return res.json(await findOrFail(City, req.params.city));
  },

  async update(req, res) {
    const city = await findOrFail(City, req.params.city);
    const data = await validated(req, { name: 'sometimes' });
    await city.update(data);
    CacheService.forgetCities();
    return res.json(updatedJson('City', city, data));
  },

  async destroy(req, res) {
    const city = await findOrFail(City, req.params.city);
    await city.destroy();
    CacheService.forgetCities();
    return res.json({ message: 'Deleted' });
  },
};
