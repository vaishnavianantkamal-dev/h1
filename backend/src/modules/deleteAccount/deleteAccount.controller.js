// Port of App\Http\Controllers\Api\DeleteAccountController
// Mails: services/mails/DeleteAccountRequestReceivedMail.send(record), services/mails/DeleteAccountStatusMail.send(record)
const { User, Customer, DeleteAccountRequest } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');

// PHP `int $id` route parameter: non-numeric strings raise a TypeError (-> 500 Server Error)
const assertIntParam = (v) => { if (!/^[+-]?\d+$/.test(String(v))) throw new TypeError('Argument #1 ($id) must be of type int, string given'); };

const ctrl = {
  // Create delete request (public - only for registered phone numbers)
  async createRequest(req, res) {
    const validated = await validate(req, {
      email: 'nullable|email',
      full_name: 'nullable|string|max:255',
      phone: 'required|string|max:20',
    });

    const user = await User.findOne({ where: { phone: validated.phone } });

    if (!user) {
      return res.status(404).json({ status: false, message: 'You are not registered with Hobit.' });
    }

    const record = await DeleteAccountRequest.create({
      email: user.email ?? validated.email ?? null,
      full_name: user.name ?? (validated.full_name ?? ''),
      phone: user.phone,
      status: DeleteAccountRequest.STATUS_PENDING,
    });

    try {
      if (record.email) {
        await require('../../services/mails/DeleteAccountRequestReceivedMail').send(record, record.email);
      }
    } catch (e) {
      console.error(e);
    }

    return res.json({
      status: true,
      message: 'Delete account request submitted. We will notify you once it is processed.',
      request_id: record.id,
    });
  },

  // Admin: list all delete account requests
  async listRequests(req, res) {
    const requests = await DeleteAccountRequest.findAll({ order: [['id', 'DESC']] });

    return res.json({ status: true, data: requests });
  },

  // Admin: approve or reject request (and notify customer by email). On approve: soft-delete the user.
  async updateRequest(req, res) {
    assertIntParam(req.params.id);
    const validated = await validate(req, {
      status: 'required|in:approved,rejected',
      reason: 'nullable|string|max:500',
    });

    const record = await findOrFail(DeleteAccountRequest, req.params.id);

    await record.update({
      status: validated.status,
      admin_reason: validated.reason ?? null,
    });

    // If approved, soft-delete the user associated with this phone
    if (record.status === DeleteAccountRequest.STATUS_APPROVED && record.phone) {
      const user = await User.findOne({
        where: { phone: record.phone },
        include: [{ model: Customer, as: 'customer', required: false }],
      });

      if (user) {
        // Soft delete user; Customer model also uses SoftDeletes
        if (user.customer) {
          await user.customer.destroy();
        }
        await user.destroy();
      }
    }

    try {
      if (record.email) {
        await require('../../services/mails/DeleteAccountStatusMail').send(record, record.email);
      }
    } catch (e) {
      console.error(e);
    }

    return res.json({ status: true, message: 'Request updated successfully. Customer has been notified.' });
  },
};

module.exports = ctrl;
