// Port of App\Http\Controllers\Api\AadhaarKycController
// NOTE: its routes are commented out in routes/api.php, so aadhaarKyc.routes.js registers nothing.
const { Worker, WorkerKyc, sequelize } = require('../../models');
const config = require('../../config');
const validate = require('../../utils/validate');
const { firstOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const surepass = require('../../services/SurepassService');

// Auth::user()->role?->slug === 'super-admin'
const isAdmin = (req) => (req.user && req.user.role ? req.user.role.slug : null) === 'super-admin';

const isEmpty = (v) => !v
  || v === '0'
  || (Array.isArray(v) && !v.length)
  || (typeof v === 'object' && !Object.keys(v).length);

// Carbon::createFromFormat(...)->toDateString() trying each format in turn
function parseDate(raw, formats) {
  for (const format of formats) {
    const d = dayjs(String(raw), format, true);
    if (d.isValid()) return d.format('YYYY-MM-DD');
  }
  return null;
}

// HELPER: Resolve worker ID from request
function resolveWorkerId(req) {
  console.log('resolveWorkerId', {
    user_id: req.user && req.user.id,
    role_slug: req.user && req.user.role ? req.user.role.slug : null,
    is_admin: isAdmin(req),
    body_worker: req.input('worker_id'),
    query_worker: req.query.worker_id,
  });

  if (isAdmin(req)) {
    if (req.filled('worker_id')) return parseInt(req.input('worker_id'), 10) || 0;
    if (req.query.worker_id) return parseInt(req.query.worker_id, 10) || 0;
    throw new Error('worker_id is required for admin.');
  }

  return Number(req.user.id);
}

// HELPER: Update kyc_status in workers table
async function updateWorkerKycStatus(workerId, status) {
  await Worker.update({ kyc_status: status }, { where: { user_id: workerId } });

  console.log('Worker kyc_status updated', { worker_id: workerId, kyc_status: status });
}

function formatAddress(address) {
  const a = address || {};
  return [a.house, a.street, a.landmark, a.loc, a.vtc, a.dist, a.state, a.pc, a.country]
    .filter((v) => v && v !== '0')
    .join(', ');
}

const ctrl = {
  // POST /kyc/initialize (Worker) | POST /admin/kyc/initialize (Admin)
  async initialize(req, res) {
    if (isAdmin(req)) {
      await validate(req, { worker_id: 'required|integer|exists:users,id' });
    }

    try {
      const workerId = resolveWorkerId(req);

      console.log('KYC Initialize', {
        auth_id: req.user.id,
        role_slug: req.user.role ? req.user.role.slug : null,
        worker_id: workerId,
      });

      const existing = await WorkerKyc.findOne({ where: { worker_id: workerId, status: 'completed' } });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Aadhaar KYC already completed for this worker.',
          data: {
            status: 'completed',
            full_name: existing.full_name,
            aadhaar: existing.aadhaar_number_masked,
            verified_at: existing.verified_at,
          },
        });
      }

      const result = await surepass.initializeDigilocker(workerId);

      const row = await WorkerKyc.findOne({ where: { worker_id: workerId } });
      if (row) await row.update({ client_id: result.client_id, status: 'pending' });
      else await WorkerKyc.create({ worker_id: workerId, client_id: result.client_id, status: 'pending' });

      // Set worker kyc_status to pending when KYC starts
      await updateWorkerKycStatus(workerId, 'pending');

      return res.json({
        success: true,
        message: 'DigiLocker session created.',
        data: {
          worker_id: workerId,
          digilocker_url: result.url,
          client_id: result.client_id,
        },
      });
    } catch (e) {
      console.error('KYC initialize error', { error: e.message });
      return res.status(500).json({
        success: false,
        message: 'Could not initialize KYC: ' + e.message,
      });
    }
  },

  // GET|POST /kyc/callback (Surepass calls this)
  async callback(req, res) {
    let kyc;
    try {
      console.log('KYC Callback received', { method: req.method, query: req.query, body: req.all() });

      const clientId = req.query.client_id ?? req.input('client_id') ?? null;

      if (!clientId) {
        console.error('KYC Callback: client_id missing');
        return res.redirect(config.appUrl + '/kyc-failed.html');
      }

      kyc = await WorkerKyc.findOne({ where: { client_id: clientId } });

      if (!kyc) {
        console.error('KYC Callback: no record found', { client_id: clientId });
        return res.redirect(config.appUrl + '/kyc-failed.html');
      }

      const body = req.all();
      const status = body.status ?? 'unknown';

      // If Surepass says failed or cancelled
      if (['failed', 'cancelled'].includes(status)) {
        await kyc.update({ status: 'failed', raw_response: body });

        // Mark worker KYC as rejected
        await updateWorkerKycStatus(kyc.worker_id, 'rejected');

        return res.redirect(config.appUrl + '/kyc-failed.html');
      }

      // Fix worker_id from state param if needed
      if (!isEmpty(body.state)) {
        const stateWorkerId = String(body.state).replace(/worker_/g, '');
        if (stateWorkerId !== '' && !isNaN(Number(stateWorkerId)) && parseInt(stateWorkerId, 10) > 0) {
          const correctId = parseInt(stateWorkerId, 10);
          if (correctId !== Number(kyc.worker_id)) {
            console.warn('Fixing worker_id from state', { old: kyc.worker_id, new: correctId });
            kyc.worker_id = correctId;
            await kyc.save();
          }
        }
      }

      // Check if aadhaar_xml_data is in callback body
      let aadhaarXml = body.aadhaar_xml_data ?? [];
      let digiMeta = body.digilocker_metadata ?? [];

      // If not in body, fetch from Surepass API
      if (isEmpty(aadhaarXml)) {
        console.log('No aadhaar_xml_data in callback body, fetching from API', { client_id: clientId });

        try {
          const fetched = await surepass.fetchAadhaarData(clientId);
          aadhaarXml = fetched.aadhaar_xml_data ?? fetched;
          digiMeta = fetched.digilocker_metadata ?? [];
        } catch (e) {
          console.error('fetchAadhaarData failed', { error: e.message });
          await kyc.update({ status: 'pending', raw_response: body });

          // Keep worker KYC as pending since data fetch failed
          await updateWorkerKycStatus(kyc.worker_id, 'pending');

          return res.redirect(config.appUrl + '/kyc-failed.html');
        }
      }

      // Parse DOB
      let dob = null;
      const dobRaw = aadhaarXml.dob ?? digiMeta.dob ?? null;
      if (dobRaw) dob = parseDate(dobRaw, ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD']);

      // Format address
      let address = '';
      if (!isEmpty(aadhaarXml.full_address)) {
        address = String(aadhaarXml.full_address).trim().replace(/\s+/g, ' ');
      } else if (!isEmpty(aadhaarXml.address) && typeof aadhaarXml.address === 'object') {
        address = formatAddress(aadhaarXml.address);
      }

      // Save to DB inside transaction
      await sequelize.transaction(async (t) => {
        await kyc.update({
          status: 'completed',
          aadhaar_number_masked: aadhaarXml.masked_aadhaar ?? aadhaarXml.aadhaar_number ?? null,
          full_name: aadhaarXml.full_name ?? digiMeta.name ?? null,
          dob,
          gender: aadhaarXml.gender ?? digiMeta.gender ?? null,
          address,
          photo_base64: aadhaarXml.profile_image ?? aadhaarXml.photo ?? null,
          raw_response: body,
          verified_at: dayjs().toDate(),
        }, { transaction: t });
      });

      // Mark worker KYC as approved
      await updateWorkerKycStatus(kyc.worker_id, 'approved');

      console.log('KYC completed successfully', { client_id: clientId, worker_id: kyc.worker_id, full_name: kyc.full_name });

      return res.redirect(config.appUrl + '/kyc-success.html');
    } catch (e) {
      console.error('KYC callback exception', { error: e.message, trace: e.stack });

      if (kyc) {
        await kyc.update({ status: 'failed' });

        // Mark worker KYC as rejected on exception
        await updateWorkerKycStatus(kyc.worker_id, 'rejected');
      }

      return res.redirect(config.appUrl + '/kyc-failed.html');
    }
  },

  // POST /kyc/fetch | POST /admin/kyc/fetch
  async fetchData(req, res) {
    await validate(req, { client_id: 'required|string' });

    try {
      const where = { client_id: req.input('client_id') };

      if (!isAdmin(req)) where.worker_id = req.user.id;

      const kyc = await firstOrFail(WorkerKyc, { where });
      const aadhaarData = await surepass.fetchAadhaarData(req.input('client_id'));

      let dob = null;
      if (!isEmpty(aadhaarData.dob)) dob = parseDate(aadhaarData.dob, ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY']);

      await kyc.update({
        status: 'completed',
        aadhaar_number_masked: aadhaarData.masked_aadhaar ?? aadhaarData.aadhaar_number ?? null,
        full_name: aadhaarData.full_name ?? aadhaarData.name ?? null,
        dob,
        gender: aadhaarData.gender ?? null,
        address: aadhaarData.full_address ?? formatAddress(aadhaarData.address ?? []),
        photo_base64: aadhaarData.profile_image ?? aadhaarData.photo ?? null,
        raw_response: aadhaarData,
        verified_at: dayjs().toDate(),
      });

      // Mark worker KYC as approved
      await updateWorkerKycStatus(kyc.worker_id, 'approved');

      return res.json({
        success: true,
        message: 'Aadhaar data fetched and saved.',
        data: {
          worker_id: kyc.worker_id,
          status: kyc.status,
          full_name: kyc.full_name,
          aadhaar: kyc.aadhaar_number_masked,
          dob: kyc.dob,
          gender: kyc.gender,
          address: kyc.address,
          verified_at: kyc.verified_at,
        },
      });
    } catch (e) {
      console.error('KYC fetchData error', { error: e.message });
      return res.status(500).json({ success: false, message: e.message });
    }
  },

  // GET /kyc/status | GET /admin/kyc/status?worker_id=508
  async status(req, res) {
    if (isAdmin(req)) {
      await validate(req, { worker_id: 'required|integer|exists:users,id' });
    }

    const workerId = resolveWorkerId(req);
    const kyc = await WorkerKyc.findOne({ where: { worker_id: workerId } });

    if (!kyc) {
      return res.json({
        success: true,
        data: { worker_id: workerId, status: 'not_started', kyc_status: 'pending' },
      });
    }

    const worker = await Worker.findOne({ where: { user_id: workerId } });

    return res.json({
      success: true,
      data: {
        worker_id: kyc.worker_id,
        status: kyc.status,
        kyc_status: (worker && worker.kyc_status) || 'pending',
        full_name: kyc.full_name,
        aadhaar: kyc.aadhaar_number_masked,
        dob: kyc.dob,
        gender: kyc.gender,
        address: kyc.address,
        verified_at: kyc.verified_at,
      },
    });
  },

  // GET /admin/kyc/{workerId}
  async workerKycDetail(req, res) {
    const workerId = parseInt(req.params.workerId, 10) || 0;

    if (workerId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid worker ID.' });
    }

    const kyc = await WorkerKyc.findOne({ where: { worker_id: workerId } });
    const worker = await Worker.findOne({ where: { user_id: workerId } });

    if (!kyc) {
      return res.status(404).json({ success: false, message: 'No KYC record found for this worker.' });
    }

    return res.json({
      success: true,
      data: {
        worker_id: kyc.worker_id,
        status: kyc.status,
        kyc_status: (worker && worker.kyc_status) || 'pending',
        full_name: kyc.full_name,
        aadhaar: kyc.aadhaar_number_masked,
        dob: kyc.dob,
        gender: kyc.gender,
        address: kyc.address,
        verified_at: kyc.verified_at,
      },
    });
  },
};

module.exports = ctrl;
