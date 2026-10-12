// Port of App\Http\Controllers\Api\BannerController
const { Banner } = require('../../models');
const storage = require('../../utils/storage');
const { findOrFail } = require('../../utils/binding');
const { filterBool, dropNulls, pick, filesOf, castDateTime, castBool, castInt } = require('../catalog/support');
const { validateBanner } = require('./requests');
const { bannerResource, bannerCollection } = require('./resources');

const FILLABLE = [
  'title', 'subtitle', 'image', 'placement', 'action_type', 'action_value', 'sort_order', 'is_active',
  'start_date', 'end_date', 'start_time', 'end_time', 'audience',
];

const imageFile = (req) => filesOf(req, 'image')[0];

module.exports = {
  /** GET /api/banners - admin list, all banners (active + inactive), optional placement filter. */
  async index(req, res) {
    const scopes = [];
    if (req.filled('placement')) scopes.push({ method: ['placement', req.input('placement')] });
    const query = scopes.length ? Banner.scope(scopes) : Banner;

    const where = {};
    if (req.has('is_active')) where.is_active = filterBool(req.input('is_active'));

    const banners = await query.findAll({ where, order: [['sort_order', 'ASC'], ['id', 'DESC']] });

    res.json({ success: true, data: bannerCollection(banners) });
  },

  /**
   * GET /api/app/banners - public app endpoint, only what should show right now, ordered.
   * The bearer token is optionally resolved so member / new_user banners can be filtered.
   */
  async app(req, res) {
    const user = req.user || null;

    const allowed = await Banner.audiencesFor(user);
    const scopes = ['visible', { method: ['forAudience', allowed] }];
    if (req.filled('placement')) scopes.push({ method: ['placement', req.input('placement')] });

    const banners = await Banner.scope(scopes).findAll({ order: [['sort_order', 'ASC']] });

    res.json({ success: true, data: bannerCollection(banners) });
  },

  /** POST /api/banners */
  async store(req, res) {
    const validated = await validateBanner(req);

    // Drop null fields so the DB defaults (placement, action_type, etc.) apply.
    const data = dropNulls(validated);
    data.image = storage.storePublic(imageFile(req), 'banners');
    if (data.start_date !== undefined) data.start_date = castDateTime(data.start_date);
    if (data.end_date !== undefined) data.end_date = castDateTime(data.end_date);

    const attrs = pick(data, FILLABLE);
    const banner = await Banner.create(attrs);

    // Eloquent create() does not read DB defaults back: the resource only sees the attributes that were passed in.
    const cast = { sort_order: castInt, is_active: castBool };
    const shown = { id: banner.id };
    FILLABLE.forEach((k) => { shown[k] = attrs[k] === undefined ? null : (cast[k] ? cast[k](attrs[k]) : attrs[k]); });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully.',
      data: bannerResource(shown),
    });
  },

  /** GET /api/banners/{banner} */
  async show(req, res) {
    const banner = await findOrFail(Banner, req.params.banner);
    res.json({ success: true, data: bannerResource(banner) });
  },

  /** PUT/PATCH /api/banners/{banner} */
  async update(req, res) {
    const banner = await findOrFail(Banner, req.params.banner);
    const validated = await validateBanner(req);

    // Drop null fields so a partial update doesn't wipe existing values.
    const data = dropNulls(validated);

    // Replace the image only if a new file was uploaded.
    const file = imageFile(req);
    if (file) {
      if (banner.image) storage.deletePublic(banner.image);
      data.image = storage.storePublic(file, 'banners');
    }

    if (data.start_date !== undefined) data.start_date = castDateTime(data.start_date);
    if (data.end_date !== undefined) data.end_date = castDateTime(data.end_date);
    await banner.update(pick(data, FILLABLE));

    res.json({
      success: true,
      message: 'Banner updated successfully.',
      data: bannerResource(await Banner.findByPk(banner.id)),
    });
  },

  /** DELETE /api/banners/{banner} (soft delete) */
  async destroy(req, res) {
    const banner = await findOrFail(Banner, req.params.banner);
    await banner.destroy();

    res.json({ success: true, message: 'Banner deleted successfully.' });
  },

  /** PATCH /api/banners/{banner}/toggle */
  async toggle(req, res) {
    const banner = await findOrFail(Banner, req.params.banner);
    await banner.update({ is_active: !banner.is_active });

    res.json({
      success: true,
      message: 'Status updated.',
      data: bannerResource(await Banner.findByPk(banner.id)),
    });
  },
};
