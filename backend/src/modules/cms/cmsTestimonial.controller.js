// Port of app/Http/Controllers/CMS/CmsTestimonialController.php
const { Testimonial } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, assigned } = require('./cmsHelpers');

const notFound = (res) => fail(res, 'Testimonial not found', 404);

const common = {
  star: 'integer|min:1|max:5',
  card_description: 'nullable|string',
  image: ['nullable', ...IMG],
  name: 'nullable|string|max:255',
  designation: 'nullable|string|max:255',
  order: 'integer',
  is_active: 'boolean',
};

module.exports = {
  // GET /cms/testimonials
  async index(req, res) {
    const testimonials = await Testimonial.findAll({ where: { is_active: true }, order: [['order', 'ASC']] });
    return ok(res, { success: true, data: testimonials });
  },

  // POST /cms/testimonials
  async store(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      ...common,
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    if (r.hasFile('image')) data.image = await ImageUploadHelper.upload(r.file('image'), 'testimonials');

    const testimonial = await Testimonial.create(data);
    return ok(res, { success: true, message: 'Testimonial created successfully', data: assigned(testimonial, data, ['star']) }, 201);
  },

  // GET /cms/testimonials/:testimonial
  async show(req, res) {
    const testimonial = await Testimonial.findByPk(req.params.testimonial);
    if (!testimonial) return notFound(res);
    return ok(res, { success: true, data: testimonial });
  },

  // PUT/PATCH /cms/testimonials/:testimonial
  async update(req, res) {
    const testimonial = await Testimonial.findByPk(req.params.testimonial);
    if (!testimonial) return notFound(res);

    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      ...common,
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    if (r.hasFile('image')) {
      if (testimonial.image) await ImageUploadHelper.delete(testimonial.image);
      data.image = await ImageUploadHelper.upload(r.file('image'), 'testimonials');
    }

    await testimonial.update(data);
    return ok(res, { success: true, message: 'Testimonial updated successfully', data: testimonial });
  },

  // DELETE /cms/testimonials/:testimonial
  async destroy(req, res) {
    const testimonial = await Testimonial.findByPk(req.params.testimonial);
    if (!testimonial) return notFound(res);

    if (testimonial.image) await ImageUploadHelper.delete(testimonial.image);
    await testimonial.destroy();

    return ok(res, { success: true, message: 'Testimonial deleted successfully' });
  },
};
