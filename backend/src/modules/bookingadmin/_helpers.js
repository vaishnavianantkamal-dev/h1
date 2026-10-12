// Small shared helpers for the booking-admin module (not a controller).
const sequelize = require('../../config/db');

// whereJsonContains('col', value)  ->  JSON_CONTAINS(`Model`.`col`, '<value>') = 1   (value is a number)
const jsonContains = (qualifiedCol, value) =>
  sequelize.where(sequelize.fn('JSON_CONTAINS', sequelize.col(qualifiedCol), JSON.stringify(Number(value))), 1);

// A service exported either as a class (needs `new`) or as a ready singleton (PHP `new X()` / app(X::class)).
const instanceOf = (mod) => (typeof mod === 'function' ? new mod() : mod);

// Laravel `array_values(array_unique(array_map('intval', $ids)))`
const intList = (arr) => [...new Set((arr || []).map((v) => parseInt(v, 10) || 0))];

// Laravel `array_values(array_unique(array_filter(array_map('intval', $ids))))`
const cleanIntIds = (ids) => intList(ids).filter(Boolean);

module.exports = { jsonContains, instanceOf, intList, cleanIntIds, sequelize };
