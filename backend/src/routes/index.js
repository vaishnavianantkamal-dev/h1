// Auto-mounts every module router:
//   src/modules/<name>/<anything>.routes.js      -> mounted under /api   (Laravel routes/api.php)
//   src/modules/<name>/<anything>.web.routes.js  -> mounted at /          (Laravel routes/web.php)
// Each file must `module.exports = router` (an express.Router). Within a file, keep the SAME ORDER as Laravel
// (static paths before wildcard paths).
const fs = require('fs');
const path = require('path');
const express = require('express');

const modulesDir = path.join(__dirname, '..', 'modules');
const api = express.Router();
const web = express.Router();

const files = [];
for (const dir of fs.existsSync(modulesDir) ? fs.readdirSync(modulesDir).sort() : []) {
  const full = path.join(modulesDir, dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full).sort()) if (f.endsWith('.routes.js')) files.push(path.join(full, f));
}
for (const f of files) {
  const router = require(f);
  (f.endsWith('.web.routes.js') ? web : api).use(router);
}

module.exports = { api, web, files };
