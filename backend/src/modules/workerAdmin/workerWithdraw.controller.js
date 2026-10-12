const { abort } = require('../../utils/errors');
// Port of App\Http\Controllers\Worker\WorkerWithdrawController
const { QueryTypes } = require('sequelize');
const { Worker, User, WorkerWithdrawal, sequelize } = require('../../models');
const config = require('../../config');
const validate = require('../../utils/validate');
const paginate = require('../../utils/paginate');
const { findOrFail, firstOrFail } = require('../../utils/binding');

// numeric-aware "min:N" (the generic validator measures string length for string input)
const minNum = (field, min) => (v) =>
  Number(v) < min ? `The ${field.replace(/_/g, ' ')} must be at least ${min}.` : true;

module.exports = {
  async withdraw(req, res) {
    const minAmount = config.services.workerWithdrawMinAmount;
    const data = await validate(req, {
      amount: 'required|numeric|min:1',
      request_note: 'nullable|string|max:255',
    });

    if (Number(data.amount) < minAmount) {
      return res.status(422).json({ message: 'Minimum withdrawal amount is ' + minAmount });
    }

    await sequelize.transaction(async (t) => {
      // DO NOT use firstOrFail
      let worker = await Worker.findOne({ where: { user_id: req.user.id }, lock: t.LOCK.UPDATE, transaction: t });

      // Auto-create worker if not exists
      if (!worker) {
        worker = await Worker.create(
          { user_id: req.user.id, wallet_balance: 0, total_earning: 0, kyc_status: 'pending' },
          { transaction: t }
        );
      }

      if (Number(worker.wallet_balance) < Number(data.amount)) {
        abort(422, 'Insufficient wallet balance');
      }

      // Create withdrawal request (wallet will be deducted on admin approval)
      await WorkerWithdrawal.create(
        { worker_id: worker.id, amount: data.amount, request_note: data.request_note ?? null, status: 'pending' },
        { transaction: t }
      );
    });

    return res.json({ message: 'Withdrawal request submitted successfully' });
  },

  async approve(req, res) {
    const id = req.params.id;
    const data = await validate(req, {
      approved_amount: 'required|numeric|min:1',
      admin_note: 'nullable|string',
    });

    await sequelize.transaction(async (t) => {
      const withdrawal = await firstOrFail(WorkerWithdrawal, {
        where: { id, status: 'pending' }, lock: t.LOCK.UPDATE, transaction: t,
      });
      const worker = await firstOrFail(Worker, {
        where: { id: withdrawal.worker_id }, lock: t.LOCK.UPDATE, transaction: t,
      });

      if (Number(worker.wallet_balance) < Number(data.approved_amount)) {
        abort(422, 'Insufficient wallet balance');
      }

      // Deduct ONLY approved amount from wallet
      await worker.decrement('wallet_balance', { by: Number(data.approved_amount), transaction: t });
      // Add approved amount to total earning (payout history)
      await worker.increment('total_earning', { by: Number(data.approved_amount), transaction: t });

      await withdrawal.update(
        { approved_amount: data.approved_amount, status: 'approved', admin_note: data.admin_note ?? null },
        { transaction: t }
      );
    });

    return res.json({ message: 'Withdrawal approved successfully' });
  },

  async reject(req, res) {
    const data = await validate(req, { admin_note: 'required|string' });
    const withdrawal = await firstOrFail(WorkerWithdrawal, { where: { id: req.params.id, status: 'pending' } });
    await withdrawal.update({ status: 'rejected', admin_note: data.admin_note });
    return res.json({ message: 'Withdrawal rejected' });
  },

  async get_withdrawls(req, res) {
    const perPage = 20;
    const page = Math.max(parseInt(req.query.page ?? 1, 10) || 1, 1);
    const replacements = [];
    let where = '';
    // Optional status filter
    if (req.filled('status')) {
      where = 'WHERE worker_withdrawals.status = ?';
      replacements.push(req.input('status'));
    }
    const from = `FROM worker_withdrawals
      INNER JOIN workers ON workers.id = worker_withdrawals.worker_id
      INNER JOIN users ON users.id = workers.user_id ${where}`;
    const [{ total }] = await sequelize.query(`SELECT COUNT(*) AS total ${from}`, {
      replacements, type: QueryTypes.SELECT,
    });
    const rows = await sequelize.query(
      `SELECT worker_withdrawals.id,
         worker_withdrawals.amount AS requested_amount,
         worker_withdrawals.approved_amount,
         worker_withdrawals.status,
         worker_withdrawals.request_note,
         worker_withdrawals.admin_note,
         worker_withdrawals.created_at,
         workers.wallet_balance,
         workers.id AS worker_id,
         users.name AS worker_name,
         users.phone AS worker_phone
       ${from} ORDER BY worker_withdrawals.id DESC LIMIT ? OFFSET ?`,
      { replacements: [...replacements, perPage, (page - 1) * perPage], type: QueryTypes.SELECT }
    );
    // decimal(10,2) columns come back from PDO as strings with the column scale
    const dec = (v) => (v === null || v === undefined ? v : Number(v).toFixed(2));
    rows.forEach((r) => {
      r.requested_amount = dec(r.requested_amount);
      r.approved_amount = dec(r.approved_amount);
      r.wallet_balance = dec(r.wallet_balance);
    });
    return res.json(paginate.build(rows, Number(total), page, perPage, req));
  },

  async withdrawal_history(req, res) {
    const user = await findOrFail(User, req.params.user);
    const worker = await Worker.findOne({ where: { user_id: user.id } });

    if (!worker) {
      return res.json({ message: 'Worker not found for this user', data: [] });
    }

    const history = await WorkerWithdrawal.findAll({ where: { worker_id: worker.id } });
    return res.json({ message: 'Withdrawal History', data: history });
  },
};
