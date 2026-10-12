// Port of app/Http/Controllers/CMS/CmsAppController.php  (model App\Models\Cms\App)
const models = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid } = require('./cmsHelpers');

// Cms\App collides with nothing in PHP; in Node the model file may be named App or CmsApp.
const App = () => models.CmsApp || models.App;
const FIELDS = ['google_image', 'applestore_image'];

module.exports = {
  // GET /cms/get-in-app
  async index(req, res) {
    const app = await App().findOne();
    if (!app) return fail(res, 'App section not found. Please create one first.', 404);
    return ok(res, { success: true, data: app });
  },

  // POST /cms/get-in-app - create only if none exists
  async store(req, res) {
    if ((await App().count()) > 0) return fail(res, 'App section already exists. Please use PUT/PATCH to update.', 400);

    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      google_image: ['nullable', ...IMG],
      google_status: 'nullable|boolean',
      applestore_image: ['nullable', ...IMG],
      applestore_status: 'nullable|boolean',
      is_active: 'nullable|boolean',
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    for (const f of FIELDS) {
      if (r.hasFile(f)) data[f] = await ImageUploadHelper.upload(r.file(f), 'apps');
    }

    const app = await App().create(data);
    return ok(res, { success: true, message: 'App section created successfully', data: app }, 201);
  },

  // PUT/PATCH /cms/get-in-app - images optional (existing kept if not sent)
  async update(req, res) {
    const app = await App().findOne();
    if (!app) return fail(res, 'App section not found. Please create one first.', 404);

    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      google_image: ['sometimes', 'nullable', ...IMG],
      google_status: 'sometimes|boolean',
      applestore_image: ['sometimes', 'nullable', ...IMG],
      applestore_status: 'sometimes|boolean',
      is_active: 'sometimes|boolean',
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    for (const f of FIELDS) {
      // Replace the image only when a new file is uploaded
      if (r.hasFile(f)) {
        if (app[f]) await ImageUploadHelper.delete(app[f]);
        data[f] = await ImageUploadHelper.upload(r.file(f), 'apps');
      } else {
        delete data[f]; // preserve existing
      }
    }

    await app.update(data);
    await app.reload();
    return ok(res, { success: true, message: 'App section updated successfully', data: app });
  },

  // POST /cms/get-in-app-save - smart save; images always optional (existing preserved)
  async storeOrUpdate(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      google_image: ['sometimes', 'nullable', ...IMG],
      google_status: 'sometimes|boolean',
      applestore_image: ['sometimes', 'nullable', ...IMG],
      applestore_status: 'sometimes|boolean',
      is_active: 'sometimes|boolean',
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    let app = await App().findOne();
    const isNew = !app;

    for (const f of FIELDS) {
      if (r.hasFile(f)) {
        if (!isNew && app[f]) await ImageUploadHelper.delete(app[f]);
        data[f] = await ImageUploadHelper.upload(r.file(f), 'apps');
      } else if (!isNew) {
        delete data[f]; // preserve existing on update
      }
    }

    if (isNew) {
      app = await App().create(data);
    } else {
      await app.update(data);
      await app.reload();
    }

    return ok(res, {
      success: true,
      message: isNew ? 'App section created successfully' : 'App section updated successfully',
      data: app,
    }, isNew ? 201 : 200);
  },
};
