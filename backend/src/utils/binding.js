// Laravel route-model binding / findOrFail().
//   const booking = await findOrFail(Booking, req.params.booking, { include: [...] });
const { HttpError } = require('./errors');

// MySQL string -> number coercion used when a string is compared with a numeric column
const mysqlNumber = (v) => { const m = /^\s*([+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)/.exec(String(v)); return m ? Number(m[1]) : 0; };

async function findOrFail(Model, id, opts = {}) {
  // `where id = '1abc'` in MySQL compares the numeric prefix (1), non-numeric strings compare as 0
  const n = mysqlNumber(id);
  const row = id === undefined || id === null || (!opts.allowNonNumeric && !Number.isInteger(n)) ? null : await Model.findByPk(opts.allowNonNumeric ? id : n, opts);
  if (!row) throw new HttpError(404, `No query results for model [App\\Models\\${Model.name}]${id === undefined || id === null || id === '' ? '.' : ' ' + id}`);
  return row;
}

async function firstOrFail(Model, opts = {}) {
  const row = await Model.findOne(opts);
  if (!row) throw new HttpError(404, `No query results for model [App\\Models\\${Model.name}].`);
  return row;
}

module.exports = { findOrFail, firstOrFail };
