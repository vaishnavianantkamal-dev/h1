// Port of app/Services/WorkerService.php
class WorkerService {
  async getWorkerPhone(workerId) {
    const { Worker, User } = require('../models');
    const worker = await Worker.findByPk(workerId);
    if (!worker || !worker.user_id) return null;

    const user = await User.findByPk(worker.user_id);
    if (!user || !user.phone) return null;

    // Normalize phone
    let phone = String(user.phone).replace(/\D/g, '');
    if (!phone.startsWith('91')) phone = '91' + phone;
    return phone;
  }
}

module.exports = new WorkerService();
module.exports.WorkerService = WorkerService;
