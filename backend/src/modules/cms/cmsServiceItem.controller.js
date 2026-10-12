// Port of app/Http/Controllers/CMS/CmsServiceItemController.php
const { ServiceItem, Op } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, asArray, slug } = require('./cmsHelpers');

// Upload an array of uploaded files and return their URLs.
async function uploadImages(files) {
  const urls = [];
  for (const file of files) {
    if (file) urls.push(await ImageUploadHelper.upload(file, 'services'));
  }
  return urls;
}

// Generate a unique slug, ignoring the current record on update.
async function uniqueSlug(value, ignoreId = null) {
  const base = slug(value);
  let s = base;
  let i = 1;
  for (;;) {
    const where = { slug: s };
    if (ignoreId) where.id = { [Op.ne]: ignoreId };
    if (!(await ServiceItem.count({ where }))) break;
    s = `${base}-${i++}`;
  }
  return s;
}

module.exports = {
  // GET /cms/service-items
  async index(req, res) {
    const services = await ServiceItem.findAll({ order: [['order', 'ASC'], ['id', 'ASC']] });
    return ok(res, { success: true, data: services });
  },

  // POST /cms/service-items
  async store(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      name: 'required|string|max:255',
      description: 'nullable|string',
      images: 'nullable|array',
      'images.*': ['nullable', ...IMG],
      order: 'integer',
      is_active: 'boolean',
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    // slug is always auto-generated from the service name
    data.slug = await uniqueSlug(data.name);

    if (r.hasFile('images')) data.images = await uploadImages(r.file('images'));

    const service = await ServiceItem.create(data);
    return ok(res, { success: true, message: 'Service created successfully', data: service }, 201);
  },

  // GET /cms/service-items/:service_item
  async show(req, res) {
    const service = await ServiceItem.findByPk(req.params.service_item);
    if (!service) return fail(res, 'Service not found', 404);
    return ok(res, { success: true, data: service });
  },

  // PUT/PATCH /cms/service-items/:service_item
  async update(req, res) {
    const service = await ServiceItem.findByPk(req.params.service_item);
    if (!service) return fail(res, 'Service not found', 404);

    const r = wrap(req);
    const v = await r.validate({
      name: 'sometimes|string|max:255',
      description: 'nullable|string',
      images: 'nullable|array',
      'images.*': ['nullable', ...IMG],
      order: 'integer',
      is_active: 'boolean',
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    // re-generate the slug from the name whenever the name changes
    if (data.name !== undefined && data.name !== null) data.slug = await uniqueSlug(data.name, service.id);

    if (r.hasFile('images')) {
      // remove old images, then store the new set
      for (const old of asArray(service.images)) await ImageUploadHelper.delete(old);
      data.images = await uploadImages(r.file('images'));
    }

    await service.update(data);
    return ok(res, { success: true, message: 'Service updated successfully', data: service });
  },

  // DELETE /cms/service-items/:service_item
  async destroy(req, res) {
    const service = await ServiceItem.findByPk(req.params.service_item);
    if (!service) return fail(res, 'Service not found', 404);

    for (const old of asArray(service.images)) await ImageUploadHelper.delete(old);
    await service.destroy();

    return ok(res, { success: true, message: 'Service deleted successfully' });
  },
};
