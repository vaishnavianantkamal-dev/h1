// Port of App\Http\Controllers\Api\DeepCleaningEnquiryController
const { DeepCleaningEnquiry } = require('../../models');
const paginate = require('../../utils/paginate');
const config = require('../../config');
const { validateEnquiryRequest } = require('./requests/enquiryRequest');

// PHP `int $id` route parameter: non-numeric strings raise a TypeError (-> 500 Server Error)
const assertIntParam = (v) => { if (!/^[+-]?\d+$/.test(String(v))) throw new TypeError('Argument #1 ($id) must be of type int, string given'); };

const ctrl = {
  // GET /api/deep-cleaning-enquiries - List all deep cleaning enquiries (paginated)
  async index(req, res) {
    const enquiries = await paginate(DeepCleaningEnquiry, req, { order: [['created_at', 'DESC']], perPage: 10 });

    return res.json({ success: true, data: enquiries });
  },

  // GET /api/deep-cleaning-enquiries/{id}
  async show(req, res) {
    assertIntParam(req.params.id);
    const enquiry = await DeepCleaningEnquiry.findByPk(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    return res.json({ success: true, data: enquiry });
  },

  // POST /api/deep-cleaning-enquiries - Submit a new deep cleaning enquiry & notify admin via email
  async store(req, res) {
    const validated = await validateEnquiryRequest(req, res);
    if (!validated) return undefined;

    const enquiry = await DeepCleaningEnquiry.create(validated);

    await require('../../services/mails/NewDeepCleaningEnquiryMail').send(enquiry, config.mail.adminEmail);

    return res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. We will get back to you soon!',
      data: enquiry,
    });
  },
};

module.exports = ctrl;
