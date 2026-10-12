// Port of app/Http/Controllers/CMS/CmsFaqController.php
const { Faq } = require('../../models');
const { wrap, ok, fail, invalid, nz, assigned } = require('./cmsHelpers');

const notFound = (res) => fail(res, 'FAQ not found', 404);

module.exports = {
  // GET /cms/faqs
  async index(req, res) {
    const faqs = await Faq.findAll({ where: { is_active: true }, order: [['order', 'ASC']] });
    return ok(res, { success: true, data: faqs });
  },

  // POST /cms/faqs - one section row with all its Q&A cards stored as JSON
  async store(req, res) {
    const v = await wrap(req).validate({
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      order: 'nullable|integer',
      is_active: 'nullable|boolean',
      cards: 'required|array|min:1',
      'cards.*.question': 'required|string',
      'cards.*.answer': 'required|string',
    });
    if (v.errors) return invalid(res, v.errors);
    const d = v.data;

    const attrs = {
      short_heading: d.short_heading,
      heading: d.heading,
      description: d.description,
      cards: d.cards, // stored as JSON
      order: nz(d.order, 0),
      is_active: nz(d.is_active, true),
    };
    const faq = await Faq.create(attrs);

    return ok(res, { success: true, message: 'FAQ created successfully', data: assigned(faq, attrs) }, 201);
  },

  // GET /cms/faqs/:faq
  async show(req, res) {
    const faq = await Faq.findByPk(req.params.faq);
    if (!faq) return notFound(res);
    return ok(res, { success: true, data: faq });
  },

  // PUT/PATCH /cms/faqs/:faq
  async update(req, res) {
    const faq = await Faq.findByPk(req.params.faq);
    if (!faq) return notFound(res);

    const v = await wrap(req).validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      order: 'sometimes|integer',
      is_active: 'sometimes|boolean',
      cards: 'sometimes|array|min:1',
      'cards.*.question': 'required_with:cards|string',
      'cards.*.answer': 'required_with:cards|string',
    });
    if (v.errors) return invalid(res, v.errors);

    await faq.update(v.data);
    await faq.reload();
    return ok(res, { success: true, message: 'FAQ updated successfully', data: faq });
  },

  // DELETE /cms/faqs/:faq
  async destroy(req, res) {
    const faq = await Faq.findByPk(req.params.faq);
    if (!faq) return notFound(res);

    await faq.destroy();
    return ok(res, { success: true, message: 'FAQ deleted successfully' });
  },

  // POST /cms/faqs-bulk - create (no id) or update (id) a whole FAQ section
  async bulkUpdate(req, res) {
    const v = await wrap(req).validate({
      id: 'sometimes|nullable|integer|exists:faqs,id',
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      order: 'sometimes|integer',
      is_active: 'sometimes|boolean',
      cards: 'required|array|min:1',
      'cards.*.question': 'required|string',
      'cards.*.answer': 'required|string',
    });
    if (v.errors) return invalid(res, v.errors);
    const d = v.data;

    const sectionId = nz(d.id, null);
    const payload = {
      short_heading: d.short_heading,
      heading: d.heading,
      description: d.description,
      cards: d.cards,
      order: nz(d.order, 0),
      is_active: nz(d.is_active, true),
    };

    if (sectionId) {
      const faq = await Faq.findByPk(sectionId);
      if (!faq) return fail(res, 'FAQ section not found', 404);

      await faq.update(payload);
      await faq.reload();
      return ok(res, { success: true, message: 'FAQ section updated successfully', data: faq });
    }

    const faq = await Faq.create(payload);
    return ok(res, { success: true, message: 'FAQ section created successfully', data: assigned(faq, payload) }, 201);
  },
};
