// Port of App\Http\Controllers\Admin\HomeCategoryController
const sequelize = require('../../config/db');
const { HomeCategory, HomeCategoryDoDont } = require('../../models');
const CacheService = require('../../services/CacheService');
const storage = require('../../utils/storage');
const { findOrFail } = require('../../utils/binding');
const {
  validateEx, fileErrors, filesOf, hasFile, pick, asArray, toJSON, castBool, createdAttrs,
} = require('../catalog/support');

const FILLABLE = ['name', 'slug', 'images', 'note', 'status', 'sort_order'];
const IMG = { maxKb: 4096, array: true };
const dosDontsInclude = () => [{ model: HomeCategoryDoDont, as: 'dosDonts', required: false }];

// ->append('image_urls')
const serialise = (row) => {
  const j = row && row.__plain ? row.__plain : toJSON(row);
  if (j.dosDonts !== undefined) { j.dos_donts = j.dosDonts; delete j.dosDonts; } // Eloquent snake_case relation key
  j.image_urls = (Array.isArray(j.images) ? j.images : (j.images && typeof j.images === 'object' ? Object.values(j.images) : [])).map((p) => storage.storageUrl(p));
  return j;
};
const loadFull = async (id) => serialise(await HomeCategory.findByPk(id, { include: dosDontsInclude() }));
// create(): only the passed attributes + relation + image_urls
const loadCreated = async (category, attrs) => {
  const full = await HomeCategory.findByPk(category.id, { include: dosDontsInclude() });
  const j = createdAttrs(category, attrs, { status: castBool });
  j.dosDonts = toJSON(full).dosDonts;
  return serialise({ __plain: j });
};

/** Replace the whole do/dont list for a category (per type that was sent). */
async function replaceDosDonts(category, dos, donts, replaceDos, replaceDonts, t) {
  const replace = async (type, list) => {
    await HomeCategoryDoDont.destroy({ where: { home_category_id: category.id, type }, transaction: t });
    let i = 0;
    for (const text of (Array.isArray(list) ? list : Object.values(list || {}))) {
      await HomeCategoryDoDont.create({ home_category_id: category.id, type, text, sort_order: i }, { transaction: t });
      i += 1;
    }
  };
  if (replaceDos) await replace('do', dos);
  if (replaceDonts) await replace('dont', donts);
}

const baseRules = {
  note: 'nullable|string',
  status: 'nullable|boolean',
  sort_order: 'nullable|integer|min:0',
  dos: 'nullable|array',
  'dos.*': 'string|max:500',
  donts: 'nullable|array',
  'donts.*': 'string|max:500',
};

module.exports = {
  /** GET /api/admin/home-categories - admin list, all categories (any status) with their dos/donts. */
  async index(req, res) {
    const categories = await HomeCategory.findAll({
      include: dosDontsInclude(),
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    res.json({ success: true, data: categories.map(serialise) });
  },

  /** POST /api/admin/home-categories - create a category together with its full dos/donts lists. */
  async store(req, res) {
    const data = await validateEx(req, {
      name: 'required|string|max:255',
      slug: 'required|string|max:255|unique:home_categories,slug',
      ...baseRules,
    }, {}, async (d, r) => fileErrors(r, 'images', IMG));

    if (hasFile(req, 'images')) {
      data.images = filesOf(req, 'images').map((f) => storage.storePublic(f, 'home_categories'));
    }

    const dos = data.dos ?? [];
    const donts = data.donts ?? [];
    delete data.dos;
    delete data.donts;
    const attrs = pick(data, FILLABLE);

    const category = await sequelize.transaction(async (t) => {
      const created = await HomeCategory.create(attrs, { transaction: t });
      await replaceDosDonts(created, dos, donts, true, true, t);
      return created;
    });

    CacheService.forgetHomeCategories();

    res.status(201).json({
      success: true,
      message: 'Home category created',
      data: await loadCreated(category, attrs),
    });
  },

  /** GET /api/admin/home-categories/{homeCategory} */
  async show(req, res) {
    const homeCategory = await findOrFail(HomeCategory, req.params.homeCategory);
    res.json({ success: true, data: await loadFull(homeCategory.id) });
  },

  /**
   * POST /api/admin/home-categories/{homeCategory}
   * Sending `dos` and/or `donts` REPLACES that whole list. `images` (files) are appended;
   * `remove_images` (array of stored paths) are deleted from storage and dropped from the images list.
   */
  async update(req, res) {
    const homeCategory = await findOrFail(HomeCategory, req.params.homeCategory);

    const data = await validateEx(req, {
      name: 'sometimes|required|string|max:255',
      slug: 'sometimes|required|string|max:255|unique:home_categories,slug,' + homeCategory.id,
      remove_images: 'nullable|array',
      'remove_images.*': 'string',
      ...baseRules,
    }, {}, async (d, r) => fileErrors(r, 'images', IMG));

    // remove_images is not a column on the model.
    delete data.remove_images;

    let existing = asArray(homeCategory.images);

    // Remove requested images: delete the files and drop them from the list.
    if (req.filled('remove_images')) {
      const toRemove = [].concat(req.input('remove_images'));
      toRemove.forEach((p) => { if (existing.includes(p)) storage.deletePublic(p); });
      existing = existing.filter((p) => !toRemove.includes(p));
      data.images = existing;
    }

    // Append newly uploaded images to the existing ones.
    if (hasFile(req, 'images')) {
      filesOf(req, 'images').forEach((f) => { existing.push(storage.storePublic(f, 'home_categories')); });
      data.images = existing;
    }

    // Only replace a list if the caller actually sent it.
    const replaceDos = req.has('dos');
    const replaceDonts = req.has('donts');
    const dos = data.dos ?? [];
    const donts = data.donts ?? [];
    delete data.dos;
    delete data.donts;

    await sequelize.transaction(async (t) => {
      await homeCategory.update(pick(data, FILLABLE), { transaction: t });
      if (replaceDos || replaceDonts) await replaceDosDonts(homeCategory, dos, donts, replaceDos, replaceDonts, t);
    });

    CacheService.forgetHomeCategories();

    res.json({
      success: true,
      message: 'Home category updated',
      data: await loadFull(homeCategory.id),
    });
  },

  /** DELETE /api/admin/home-categories/{homeCategory} */
  async destroy(req, res) {
    const homeCategory = await findOrFail(HomeCategory, req.params.homeCategory);

    asArray(homeCategory.images).forEach((p) => storage.deletePublic(p));

    // dos/donts cascade-delete via FK
    await HomeCategoryDoDont.destroy({ where: { home_category_id: homeCategory.id } });
    await homeCategory.destroy();

    CacheService.forgetHomeCategories();

    res.json({ success: true, message: 'Home category deleted' });
  },
};
