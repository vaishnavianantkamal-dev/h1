// Port of App\Http\Controllers\Api\Worker\BankDetailsController
const { Worker } = require('../../models');
const validate = require('../../utils/validate');
const Crypt = require('../../utils/crypt');

const notFound = (res) => res.status(404).json({ status: false, message: 'Worker profile not found' });

function decryptAccount(worker) {
  try {
    return worker.account_no ? Crypt.decryptString(worker.account_no) : null;
  } catch (e) {
    return null; // safety fallback
  }
}

const bankData = (worker) => ({
  account_holder_name: worker.account_holder_name,
  account_no: decryptAccount(worker), // decrypted
  bank_name: worker.bank_name,
  ifsc_code: worker.ifsc_code,
});

const bankRules = {
  account_holder_name: 'required|string|max:255',
  account_no: 'required|string|max:30',
  bank_name: 'required|string|max:255',
  ifsc_code: 'required|string',
};

const bankUpdate = (req) => ({
  account_holder_name: req.input('account_holder_name'),
  account_no: Crypt.encryptString(req.input('account_no')),
  bank_name: req.input('bank_name'),
  ifsc_code: String(req.input('ifsc_code')).toUpperCase(),
});

module.exports = {
  async show(req, res) {
    const worker = await Worker.findOne({ where: { user_id: req.user.id } });
    if (!worker) return notFound(res);
    return res.json({ status: true, data: bankData(worker) });
  },

  // 16. PUT /worker/bank-details
  async update(req, res) {
    await validate(req, bankRules);
    const worker = await Worker.findOne({ where: { user_id: req.user.id } });
    if (!worker) return notFound(res);
    await worker.update(bankUpdate(req));
    return res.json({ status: true, message: 'Bank details updated successfully' });
  },

  async update_by_id(req, res) {
    await validate(req, { user_id: 'required|exists:users,id', ...bankRules });
    // Find worker by user_id
    const worker = await Worker.findOne({ where: { user_id: req.input('user_id') } });
    if (!worker) return notFound(res);
    // Create or Update bank details
    await worker.update(bankUpdate(req));
    return res.json({ status: true, message: 'Bank details saved successfully' });
  },

  async show_by_id(req, res) {
    // Find worker by user_id
    const worker = await Worker.findOne({ where: { user_id: req.params.user_id } });
    if (!worker) return notFound(res);
    return res.json({ status: true, data: bankData(worker) });
  },
};
