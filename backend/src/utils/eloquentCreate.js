// Eloquent `Model::create($validated)` returns a model holding ONLY the attributes that were passed
// (raw values - '3' stays "3", nulls stay null) + id/created_at/updated_at; DB-default columns are NOT refreshed.
// Usage: const { instance, json } = await createLikeEloquent(Model, req, keys)   // keys = validated field names
async function createLikeEloquent(Model, req, keys) {
  const raw = {};
  for (const k of keys) if (req.has(k)) raw[k] = req.input(k);
  const instance = await Model.create(raw);
  const full = instance.toJSON();
  const json = {};
  for (const k of Object.keys(raw)) json[k] = raw[k];
  for (const k of ['id', 'created_at', 'updated_at']) if (k in full) json[k] = full[k];
  return { instance, json };
}

module.exports = { createLikeEloquent };
