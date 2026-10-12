// Port of App\Http\Controllers\Api\AddonController
const { Addon } = require('../../models');
const CacheService = require('../../services/CacheService');
const config = require('../../config');
const storage = require('../../utils/storage');
const { findOrFail } = require('../../utils/binding');
const {
  validateEx, fileErrors, filesOf, hasFile, pick, asArray, toJSON, clone, inMemory,
} = require('./support');

const FILLABLE = ['name', 'description', 'images', 'price', 'status'];
const IMG = { mimes: ['jpg', 'jpeg', 'png', 'webp'], maxKb: 2048, array: true };

// Convert stored image paths to full URLs
const withUrls = (addon) => {
  const base = String(config.appUrl || '').replace(/\/+$/, '');
  addon.images = asArray(addon.images)
    .filter(Boolean)
    .map((p) => base + '/storage/app/public/' + String(p).replace(/^\/+/, ''));
  return addon;
};

const storeImages = (req) => filesOf(req, 'images').map((f) => storage.storePublic(f, 'addons'));

module.exports = {
  async index(req, res) {
    const addons = await CacheService.remember(
      CacheService.addons(),
      CacheService.TTL_1H,
      async () => (await Addon.findAll({ order: [['id', 'DESC']] })).map(toJSON),
    );

    // Convert stored image paths to full URLs AFTER cache (output identical either way)
    res.json({ success: true, data: clone(addons).map(withUrls) });
  },

  async store(req, res) {
    const validated = await validateEx(req, {
      name: ['required', 'string', 'max:255'],
      description: ['nullable', 'string'],
      price: ['required', 'numeric', 'min:0'],
      status: ['sometimes', 'boolean'],
    }, {}, async (d, r) => fileErrors(r, 'images', IMG));

    const imagePaths = hasFile(req, 'images') ? storeImages(req) : [];

    const assigned = {
      name: validated.name,
      description: validated.description ?? null,
      price: validated.price,
      status: validated.status ?? true,
      images: imagePaths,
    };
    const addon = await Addon.create(assigned);

    CacheService.forgetAddons();

    res.status(201).json({
      success: true,
      message: 'Addon created successfully',
      data: inMemory('Addon', {}, assigned, addon),
    });
  },

  async show(req, res) {
    const addon = await findOrFail(Addon, req.params.addon);
    res.json({ success: true, data: withUrls(toJSON(addon)) });
  },

  async update(req, res) {
    const addon = await findOrFail(Addon, req.params.addon);

    const data = await validateEx(req, {
      name: ['sometimes', 'string', 'max:255'],
      description: ['nullable', 'string'],
      price: ['sometimes', 'numeric', 'min:0'],
      status: ['sometimes', 'boolean'],
    }, {}, async (d, r) => fileErrors(r, 'images', IMG));

    // `images` itself (non-file) was only validated as nullable|array
    if (!hasFile(req, 'images') && req.has('images') && req.input('images') === null) data.images = null;

    // If new images uploaded: delete old files, then save new paths
    if (hasFile(req, 'images')) {
      asArray(addon.images).forEach((p) => { if (p) storage.deletePublic(p); });
      data.images = storeImages(req);
    }

    const base = toJSON(addon);
    const assigned = pick(data, FILLABLE);
    await addon.update(assigned);

    CacheService.forgetAddons();

    res.json({
      success: true,
      message: 'Addon updated successfully',
      data: inMemory('Addon', base, assigned, addon),
    });
  },

  async destroy(req, res) {
    const addon = await findOrFail(Addon, req.params.addon);

    // Delete associated image files from storage
    asArray(addon.images).forEach((p) => { if (p) storage.deletePublic(p); });

    await addon.destroy();

    CacheService.forgetAddons();

    res.json({ success: true, message: 'Addon deleted successfully' });
  },
};
