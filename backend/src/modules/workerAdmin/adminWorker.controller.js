// Port of App\Http\Controllers\Api\Admin\AdminWorkerController
const { Worker, User, WorkerAvailability } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');

module.exports = {
  // Generic update KYC status (optional)
  async updateKycStatus(req, res) {
    const worker = await findOrFail(Worker, req.params.worker);
    const data = await validate(req, { kyc_status: 'required|in:approved,rejected,pending' });
    await worker.update({ kyc_status: data.kyc_status });
    return res.json({ success: true, message: 'Worker KYC status updated' });
  },

  async approveKyc(req, res) {
    const worker = await findOrFail(Worker, req.params.worker);
    await worker.update({ kyc_status: 'approved' });
    // Activate user
    await User.update({ is_active: 1 }, { where: { id: worker.user_id } });
    // Enable availability
    await WorkerAvailability.update({ status: true }, { where: { worker_id: worker.user_id } });
    return res.json({ success: true, message: 'Worker KYC approved. Worker activated and available.' });
  },

  async rejectKyc(req, res) {
    const worker = await findOrFail(Worker, req.params.worker);
    await worker.update({ kyc_status: 'rejected' });
    // Deactivate user
    await User.update({ is_active: 0 }, { where: { id: worker.user_id } });
    // Disable availability
    await WorkerAvailability.update({ status: false }, { where: { worker_id: worker.user_id } });
    return res.json({ success: true, message: 'Worker KYC rejected. Worker deactivated.' });
  },

  async pendingKyc(req, res) {
    const worker = await findOrFail(Worker, req.params.worker);
    await worker.update({ kyc_status: 'pending' });
    // Deactivate user
    await User.update({ is_active: 0 }, { where: { id: worker.user_id } });
    // Disable availability
    await WorkerAvailability.update({ status: false }, { where: { worker_id: worker.user_id } });
    return res.json({ success: true, message: 'Worker KYC set to pending. Worker unavailable.' });
  },
};
