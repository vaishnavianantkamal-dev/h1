// Smoke test: calls every GET route (anonymous, then as admin) and reports crashes (HTTP 5xx).
// Usage:  npm run smoke          (needs MySQL running and `npm run db:setup` done)
//         SMOKE_ALL=1 npm run smoke   also calls POST/PUT/PATCH/DELETE with an empty body (writes data - test DB only!)
process.env.RUN_SCHEDULER = 'false';
const path = require('path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
require('dotenv').config({ path: path.join(root, '.env') });

const m = require(path.join(root, 'src/app.js'));
const app = m.app || m.default || m;

const SKIP = /logout|test-|send|cron|webhook|delete-account|export|download/i;

function prefixOf(l) {
  const src = l.regexp.source;
  if (src === '^\\/?(?=\\/|$)') return '';
  return src
    .replace('^', '')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':p')
    .replace(/\\\//g, '/');
}
function collect(stack, prefix, out) {
  for (const l of stack) {
    if (l.route) {
      for (const k of Object.keys(l.route.methods)) out.push({ method: k.toUpperCase(), url: prefix + l.route.path });
    } else if (l.handle && l.handle.stack) {
      collect(l.handle.stack, prefix + prefixOf(l), out);
    }
  }
}

function fill(url) {
  return url
    .replace(/:[A-Za-z_]+(\([^)]*\))?\??/g, '1')
    .replace(/\/\/+/g, '/')
    .replace(/\/$/, '') || '/';
}

async function run() {
  const routes = [];
  collect((app._router || app.router).stack, '', routes);
  const all = process.env.SMOKE_ALL === '1';
  const todo = routes.filter((r) => (all || r.method === 'GET') && !SKIP.test(r.url));

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  let token = null;
  try {
    const res = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        login: process.env.SEED_ADMIN_EMAIL || process.env.SEED_ADMIN_PHONE,
        password: process.env.SEED_ADMIN_PASSWORD,
      }),
    });
    const j = await res.json();
    token = j.token || null;
  } catch (e) { /* ignore */ }
  console.log(token ? 'Admin login OK' : 'Admin login FAILED - only anonymous results will be meaningful (run npm run db:setup)');
  console.log(`Testing ${todo.length} of ${routes.length} routes...\n`);

  const failures = [];
  const tally = {};
  for (const mode of token ? ['anonymous', 'admin'] : ['anonymous']) {
    for (const r of todo) {
      const url = fill(r.url);
      const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
      if (mode === 'admin') headers.Authorization = `Bearer ${token}`;
      let status;
      try {
        const res = await fetch(base + url, {
          method: r.method,
          headers,
          body: r.method === 'GET' ? undefined : '{}',
          signal: AbortSignal.timeout(15000),
        });
        status = res.status;
        await res.text();
      } catch (e) {
        status = 'ERR ' + e.message;
      }
      const bucket = typeof status === 'number' ? `${String(status)[0]}xx` : 'ERR';
      tally[`${mode} ${bucket}`] = (tally[`${mode} ${bucket}`] || 0) + 1;
      if (bucket === '5xx' || bucket === 'ERR') failures.push(`${mode.padEnd(9)} ${r.method.padEnd(6)} ${url}  -> ${status}`);
    }
  }

  console.log('Summary:', tally);
  if (failures.length) {
    console.log(`\n${failures.length} route(s) crashed (5xx / error):`);
    failures.forEach((f) => console.log('  ' + f));
  } else {
    console.log('\nNo route returned a 5xx error.');
  }
  server.close();
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(2); });
