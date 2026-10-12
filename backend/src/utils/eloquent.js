// Helpers reproducing what an Eloquent model instance serialises to right after create()/update():
//  - create(): ONLY the attributes that were assigned (+ id, timestamps, hook-set attributes) - DB defaults are NOT loaded.
//  - update(): all loaded columns, with the assigned attributes holding the RAW assigned value (casts still apply on read).
const meta = require('../models/phpMeta.json');

const castsOf = (modelName) => (meta[modelName] || {}).casts || {};

// value Eloquent returns for an assigned attribute: cast columns are cast on read, others stay as assigned
const readAssigned = (modelName, key, raw, jsonValue) => (castsOf(modelName)[key] ? jsonValue : raw);

// instance = freshly created Sequelize instance, assigned = object given to create(), extra = more keys to copy from the instance JSON
function createdJson(modelName, instance, assigned, extra = []) {
  const j = instance.toJSON();
  const out = {};
  for (const k of Object.keys(assigned)) out[k] = readAssigned(modelName, k, assigned[k], j[k]);
  for (const k of [...extra, 'updated_at', 'created_at', 'id']) if (k in j) out[k] = j[k];
  return out;
}

// instance = loaded + updated instance, assigned = object given to update()
function updatedJson(modelName, instance, assigned) {
  const j = instance.toJSON();
  for (const k of Object.keys(assigned)) if (k in j || assigned[k] !== undefined) j[k] = readAssigned(modelName, k, assigned[k], j[k]);
  return j;
}

module.exports = { createdJson, updatedJson, readAssigned };
