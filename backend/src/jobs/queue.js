// Durable job queue (replaces Laravel queue:work + `jobs` table). Backed by the `node_jobs` table, so delayed jobs
// survive restarts.
//
//   queue.register('SendCloseOtpJob', async (payload) => { ... })      // once, at module load
//   await queue.dispatch('SendCloseOtpJob', { bookingId: 5 }, { delaySeconds: 600 })   // dispatch(...)->delay(...)
//   queue.startWorker()                                                // done by server.js
const { Op } = require('sequelize');

const handlers = {};
let timer = null;
let busy = false;

const register = (name, fn) => { handlers[name] = fn; };

async function dispatch(name, payload = {}, { delaySeconds = 0 } = {}) {
  const { NodeJob } = require('../models');
  return NodeJob.create({ name, payload, run_at: new Date(Date.now() + delaySeconds * 1000), status: 'pending' });
}

// Run immediately in-process (dispatchSync / ->dispatchAfterResponse)
async function dispatchNow(name, payload = {}) {
  if (!handlers[name]) throw new Error(`No handler registered for job ${name}`);
  return handlers[name](payload);
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    const { NodeJob } = require('../models');
    const due = await NodeJob.findAll({ where: { status: 'pending', run_at: { [Op.lte]: new Date() } }, order: [['run_at', 'ASC']], limit: 25 });
    for (const job of due) {
      const [claimed] = await NodeJob.update({ status: 'running', attempts: job.attempts + 1 }, { where: { id: job.id, status: 'pending' } });
      if (!claimed) continue;
      try {
        if (!handlers[job.name]) throw new Error(`No handler registered for job ${job.name}`);
        let payload = job.payload || {};
        if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (_) { payload = {}; } } // MariaDB returns JSON columns as text
        await handlers[job.name](payload);
        await job.update({ status: 'done' });
      } catch (e) {
        console.error(`[queue] ${job.name}#${job.id} failed:`, e.message);
        await job.update({ status: job.attempts >= 3 ? 'failed' : 'pending', last_error: String(e.stack || e).slice(0, 5000), run_at: new Date(Date.now() + 60_000) });
      }
    }
  } catch (e) {
    console.error('[queue] tick error', e.message);
  } finally {
    busy = false;
  }
}

async function startWorker() {
  const { NodeJob } = require('../models');
  await NodeJob.sync(); // creates node_jobs if missing - the only table the Node app creates
  await NodeJob.update({ status: 'pending' }, { where: { status: 'running' } }); // recover jobs killed mid-run
  timer = setInterval(tick, 5000);
  console.log('[queue] worker started');
}
const stopWorker = () => timer && clearInterval(timer);

module.exports = { register, dispatch, dispatchNow, startWorker, stopWorker, tick };
