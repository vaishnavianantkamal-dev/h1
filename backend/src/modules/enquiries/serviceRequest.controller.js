// Hobit1: service booking requests from the website (no Laravel original).
// Public POST stores the request and emails the admin; the admin panel lists them and updates the status.
const { Op } = require('sequelize');
const { ServiceRequest } = require('../../models');
const paginate = require('../../utils/paginate');
const validate = require('../../utils/validate');
const config = require('../../config');

const assertIntParam = (v) => { if (!/^\d+$/.test(String(v))) throw new TypeError('Invalid id'); };

const rules = {
  service_id: 'required|string|max:100',
  service_name: 'required|string|max:255',
  category: 'required|string|max:100',
  sub_category: 'nullable|string|max:100',
  name: 'required|string|max:100',
  phone: ['required', 'string', 'regex:/^[6-9][0-9]{9}$/'],
  email: 'nullable|email|max:100',
  address: 'required|string|max:1000',
  locality: 'nullable|string|max:150',
  landmark: 'nullable|string|max:150',
  city: 'required|string|max:100',
  pincode: 'required|digits:6',
  latitude: 'nullable|numeric|between:-90,90',
  longitude: 'nullable|numeric|between:-180,180',
  preferred_date: 'nullable|date|after_or_equal:today',
  preferred_time: `nullable|in:${ServiceRequest.TIME_SLOTS.join(',')}`,
  payment_method: `required|in:${ServiceRequest.PAYMENT_METHODS.join(',')}`,
  notes: 'nullable|string|max:2000',
};

const messages = {
  'name.required': 'Please enter your name.',
  'phone.required': 'Please enter your phone number.',
  'phone.regex': 'Please enter a valid 10-digit mobile number.',
  'address.required': 'Please enter your address.',
  'pincode.required': 'Please enter your pincode.',
  'pincode.digits': 'Pincode must be 6 digits.',
  'payment_method.required': 'Please choose a payment method.',
  'preferred_date.after_or_equal': 'Preferred date cannot be in the past.',
};

const ctrl = {
  // GET /api/service-requests?page=&status=&search=  (admin)
  async index(req, res) {
    const where = {};
    const status = req.query.status;
    if (status && ServiceRequest.STATUSES.includes(status)) where.status = status;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      const like = { [Op.like]: `%${search}%` };
      where[Op.or] = [
        { name: like }, { phone: like }, { service_name: like }, { category: like },
        { pincode: like }, { locality: like }, { address: like },
      ];
    }
    const requests = await paginate(ServiceRequest, req, { where, order: [['created_at', 'DESC']], perPage: 15 });
    return res.json({ success: true, data: requests });
  },

  // GET /api/service-requests/:id  (admin)
  async show(req, res) {
    assertIntParam(req.params.id);
    const request = await ServiceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found.' });
    return res.json({ success: true, data: request });
  },

  // POST /api/service-requests  (public website form)
  async store(req, res) {
    const validated = await validate(req, rules, messages);
    const request = await ServiceRequest.create({ ...validated, status: 'new' });

    // MailService fails soft (logs) when SMTP is not configured
    await require('../../services/mails/NewServiceRequestMail').send(request, config.mail.adminEmail);

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your request has been received. Our team will call you shortly to confirm.',
      data: { id: request.id },
    });
  },

  // PATCH /api/service-requests/:id/status  (admin)
  async updateStatus(req, res) {
    assertIntParam(req.params.id);
    const { status } = await validate(req, { status: `required|in:${ServiceRequest.STATUSES.join(',')}` });
    const request = await ServiceRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Service request not found.' });
    await request.update({ status });
    return res.json({ success: true, message: 'Status updated.', data: request });
  },
};

module.exports = ctrl;
