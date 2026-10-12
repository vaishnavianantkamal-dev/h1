// Port of app/Http/Controllers/CMS/CmsEarnBannerController.php
const { EarnBanner } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid } = require('./cmsHelpers');

module.exports = {
  // GET /cms/earn-banner - admin: the earn badge config (always a single row)
  async index(req, res) {
    const banner = await EarnBanner.findOne();
    if (!banner) return fail(res, 'Earn banner not found. Please create one first.', 404);
    return ok(res, { success: true, data: banner });
  },

  // POST /cms/earn-banner-save - smart save; icon optional (existing preserved when not re-uploaded)
  async storeOrUpdate(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      title: 'required|string|max:255',
      amount: 'sometimes|nullable|numeric|min:0',
      currency_symbol: 'sometimes|string|max:8',
      subtitle: 'sometimes|nullable|string|max:255',
      icon: ['sometimes', 'nullable', ...IMG],
      action_url: 'sometimes|nullable|string|max:2048',
      is_active: 'sometimes|boolean',
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    let banner = await EarnBanner.findOne();
    const isNew = !banner;

    // Replace the icon only when a new file is uploaded; otherwise keep existing.
    if (r.hasFile('icon')) {
      if (!isNew && banner.icon) await ImageUploadHelper.delete(banner.icon);
      data.icon = await ImageUploadHelper.upload(r.file('icon'), 'earn');
    } else if (!isNew) {
      delete data.icon; // preserve existing on update
    }

    if (isNew) {
      banner = await EarnBanner.create(data);
    } else {
      await banner.update(data);
      await banner.reload();
    }

    return ok(res, {
      success: true,
      message: isNew ? 'Earn banner created successfully' : 'Earn banner updated successfully',
      data: banner,
    }, isNew ? 201 : 200);
  },

  // GET /app/earn-banner - public; data is null when inactive so the app hides the chip
  async app(req, res) {
    const banner = await EarnBanner.findOne({ where: { is_active: true } });
    return ok(res, { success: true, data: banner });
  },
};
