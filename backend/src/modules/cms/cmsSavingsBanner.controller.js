// Port of app/Http/Controllers/CMS/CmsSavingsBannerController.php  (model Cms\SavingsPromoBanner)
const { SavingsPromoBanner } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, asArray } = require('./cmsHelpers');

module.exports = {
  // GET /cms/savings-banner - admin: savings promo config (always a single row)
  async index(req, res) {
    const banner = await SavingsPromoBanner.findOne();
    if (!banner) return fail(res, 'Savings banner not found. Please create one first.', 404);
    return ok(res, { success: true, data: banner });
  },

  // POST /cms/savings-banner-save - smart save; carousel images preserved unless changed
  async storeOrUpdate(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      title: 'sometimes|nullable|string|max:255',
      subtitle: 'sometimes|nullable|string|max:255',
      images: 'sometimes|array',
      'images.*': IMG,
      remove_images: 'sometimes|array',
      'remove_images.*': 'string',
      is_active: 'sometimes|boolean',
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    let banner = await SavingsPromoBanner.findOne();
    const isNew = !banner;

    // Carousel images: start from whatever the banner already has.
    let images = isNew ? [] : asArray(banner.images);

    // Remove any images the admin explicitly dropped (delete file + drop URL).
    const removeImages = Array.isArray(data.remove_images) ? data.remove_images : [];
    if (removeImages.length) {
      for (const url of removeImages) await ImageUploadHelper.delete(url);
      images = images.filter((u) => !removeImages.includes(u));
    }

    // Append newly uploaded images to the set.
    if (r.hasFile('images')) {
      for (const file of r.file('images')) images.push(await ImageUploadHelper.upload(file, 'savings'));
    }

    // Only write the images column when it actually changed.
    if (r.hasFile('images') || removeImages.length || isNew) {
      data.images = images;
    }
    delete data.remove_images; // not a table column

    if (isNew) {
      banner = await SavingsPromoBanner.create(data);
    } else {
      await banner.update(data);
      await banner.reload();
    }

    return ok(res, {
      success: true,
      message: isNew ? 'Savings banner created successfully' : 'Savings banner updated successfully',
      data: banner,
    }, isNew ? 201 : 200);
  },

  // GET /app/savings-banner - public; data is null when inactive
  async app(req, res) {
    const banner = await SavingsPromoBanner.findOne({ where: { is_active: true } });
    return ok(res, { success: true, data: banner });
  },
};
