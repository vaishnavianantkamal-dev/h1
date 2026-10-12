// Port of app/Http/Controllers/CMS/CmsSubscriptionBenefitController.php
const { SubscriptionBenefit } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, entries, nz, serviceType } = require('./cmsHelpers');

/** Fallback heading when no rows exist yet. */
const HEADING_DEFAULT = 'Subscription Benefits';

module.exports = {
  // GET /cms/subscription-benefits?type=cleaner|cook - heading + every benefit row for a service
  async index(req, res) {
    const r = wrap(req);
    const type = serviceType(r);

    const benefits = await SubscriptionBenefit.findAll({
      where: { service_type: type },
      order: [['order', 'ASC'], ['id', 'ASC']],
    });

    return ok(res, {
      success: true,
      data: {
        service_type: type,
        heading: nz(benefits[0] && benefits[0].heading, HEADING_DEFAULT),
        benefits,
      },
    });
  },

  // POST /cms/subscription-benefits-bulk - smart save (parallel, index-aligned arrays title[] / item_id[] / icon[])
  async bulkSave(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      heading: 'required|string|max:255',
      is_active: 'sometimes|boolean',

      item_id: 'sometimes|array',
      'item_id.*': 'nullable|integer|exists:subscription_benefits,id',

      title: 'required|array|min:1',
      'title.*': 'required|string|max:255',

      icon: 'sometimes|array',
      'icon.*': ['nullable', ...IMG],

      remove_icon: 'sometimes|array',
      'remove_icon.*': 'nullable|boolean',
    });
    if (v.errors) return invalid(res, v.errors);

    const type = serviceType(r);
    const heading = r.input('heading');
    const results = [];

    for (const [index, title] of entries(r.input('title'))) {
      const itemId = r.input(`item_id.${index}`); // null -> new row
      const hasIcon = r.hasFile(`icon.${index}`);

      if (itemId) {
        // Scope to the service so one type can't edit another's rows.
        const benefit = await SubscriptionBenefit.findOne({ where: { service_type: type, id: itemId } });

        if (!benefit) return fail(res, `Benefit with id ${itemId} not found for service '${type}'`, 404);

        const updateData = { heading, title, order: index };

        if (r.has('is_active')) updateData.is_active = r.boolean('is_active');

        // Icon: new file -> replace; remove_icon flag -> clear; else keep existing.
        if (hasIcon) {
          if (benefit.icon) await ImageUploadHelper.delete(benefit.icon);
          updateData.icon = await ImageUploadHelper.upload(r.file(`icon.${index}`), 'subscription-benefits');
        } else if (r.boolean(`remove_icon.${index}`)) {
          if (benefit.icon) await ImageUploadHelper.delete(benefit.icon);
          updateData.icon = null;
        }

        await benefit.update(updateData);
        await benefit.reload();
        results.push(benefit);
      } else {
        const iconPath = hasIcon
          ? await ImageUploadHelper.upload(r.file(`icon.${index}`), 'subscription-benefits')
          : null;

        results.push(await SubscriptionBenefit.create({
          service_type: type,
          heading,
          title,
          icon: iconPath,
          order: index,
          is_active: r.boolean('is_active', true),
        }));
      }
    }

    return ok(res, { success: true, message: 'Subscription benefits saved successfully', data: results });
  },

  // DELETE /cms/subscription-benefits/:id
  async destroy(req, res) {
    const benefit = await SubscriptionBenefit.findByPk(req.params.id);
    if (!benefit) return fail(res, 'Subscription benefit not found', 404);

    if (benefit.icon) await ImageUploadHelper.delete(benefit.icon);
    await benefit.destroy();

    return ok(res, { success: true, message: 'Subscription benefit deleted successfully' });
  },

  // GET /app/subscription-benefits - public; active rows only, in display order
  async app(req, res) {
    const type = serviceType(wrap(req));

    const benefits = await SubscriptionBenefit.findAll({
      where: { service_type: type, is_active: true },
      order: [['order', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'heading', 'title', 'icon'],
    });

    return ok(res, {
      success: true,
      data: {
        service_type: type,
        heading: nz(benefits[0] && benefits[0].heading, HEADING_DEFAULT),
        benefits: benefits.map((b) => ({ id: b.id, title: b.title, icon: b.icon })),
      },
    });
  },
};
