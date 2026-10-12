// Laravel-compatible bcrypt ($2y$). Existing PHP password hashes verify unchanged.
const bcrypt = require('bcryptjs');

const make = (plain) => bcrypt.hashSync(String(plain), 12).replace(/^\$2[ab]\$/, '$2y$');
const check = (plain, hash) => !!hash && bcrypt.compareSync(String(plain), String(hash).replace(/^\$2y\$/, '$2a$'));

module.exports = { make, check };
