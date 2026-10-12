// Port of App\Http\Controllers\Api\HomeController
const { HomeCategory, HomeCategoryDoDont, Marquee } = require('../../models');
const storage = require('../../utils/storage');
const { findOrFail } = require('../../utils/binding');
const { asArray, toJSON } = require('../catalog/support');

// Turn stored image paths into full public URLs (APP_URL/storage/<path>).
const imgList = (v) => {
  const a = typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch (_) { return null; } })() : v;
  if (Array.isArray(a)) return a;
  return a && typeof a === 'object' ? Object.values(a) : []; // Eloquent array cast of a JSON object = assoc array
};
const mapImages = (images) => imgList(images).map((p) => storage.storageUrl(p));

module.exports = {
  /** GET /api/home/categories - public home screen category grid. Active categories only. */
  async categories(req, res) {
    const rows = await HomeCategory.findAll({
      where: { status: 1 },
      attributes: ['id', 'name', 'slug', 'images'],
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    const categories = rows.map((c) => {
      const j = toJSON(c);
      j.images = mapImages(j.images);
      return j;
    });

    res.json({ success: true, data: categories });
  },

  /** GET /api/home/categories/{homeCategory} - the "What is included?" detail screen for one category. */
  async categoryDetails(req, res) {
    const homeCategory = await findOrFail(HomeCategory, req.params.homeCategory);
    const items = await HomeCategoryDoDont.findAll({
      where: { home_category_id: homeCategory.id },
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        category: {
          id: homeCategory.id,
          name: homeCategory.name,
          slug: homeCategory.slug,
          images: mapImages(homeCategory.images),
        },
        included: items.filter((i) => i.type === 'do').map((i) => i.text),
        not_included: items.filter((i) => i.type === 'dont').map((i) => i.text),
        note: homeCategory.note,
      },
    });
  },

  /** GET /api/home/marquee - active marquee sentences in display order (plain array of strings). */
  async marquee(req, res) {
    const rows = await Marquee.findAll({
      where: { status: 1 },
      attributes: ['text'],
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });

    res.json({ success: true, data: rows.map((r) => r.text) });
  },
};
