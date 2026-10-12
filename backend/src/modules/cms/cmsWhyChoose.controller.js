// Port of app/Http/Controllers/CMS/CmsWhyChooseController.php  (model Cms\WhyChooseCard)
const { WhyChooseCard } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, entries, nz, serviceType } = require('./cmsHelpers');

const HEADING_DEFAULT = 'Why Choose Hobit?';

module.exports = {
  // GET /cms/why-choose?type=cleaner|cook - section header (from first row) + every card for a service
  async index(req, res) {
    const type = serviceType(wrap(req));
    const cards = await WhyChooseCard.findAll({
      where: { service_type: type },
      order: [['order', 'ASC'], ['id', 'ASC']],
    });
    const first = cards[0];

    return ok(res, {
      success: true,
      data: {
        service_type: type,
        heading: nz(first && first.heading, HEADING_DEFAULT),
        subtitle: nz(first && first.subtitle, null),
        section_icon: nz(first && first.section_icon, null),
        cards,
      },
    });
  },

  // POST /cms/why-choose-bulk - header fields (written to every row) + cards in one request
  async bulkSave(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      heading: 'required|string|max:255',
      subtitle: 'sometimes|nullable|string|max:255',
      section_icon: ['sometimes', 'nullable', ...IMG],
      is_active: 'sometimes|boolean',

      item_id: 'sometimes|array',
      'item_id.*': 'nullable|integer|exists:why_choose_cards,id',

      card_title: 'required|array|min:1',
      'card_title.*': 'required|string|max:255',

      card_icon: 'sometimes|array',
      'card_icon.*': ['nullable', ...IMG],

      remove_section_icon: 'sometimes|boolean',
      remove_card_icon: 'sometimes|array',
      'remove_card_icon.*': 'nullable|boolean',
    });
    if (v.errors) return invalid(res, v.errors);

    const type = serviceType(r);

    // Resolve the section icon: new upload, else preserve the existing one (per service).
    const existing = await WhyChooseCard.findOne({
      where: { service_type: type },
      order: [['order', 'ASC'], ['id', 'ASC']],
    });
    let sectionIcon = nz(existing && existing.section_icon, null);

    if (r.hasFile('section_icon')) {
      if (sectionIcon) await ImageUploadHelper.delete(sectionIcon);
      sectionIcon = await ImageUploadHelper.upload(r.file('section_icon'), 'why-choose');
    } else if (r.boolean('remove_section_icon')) {
      if (sectionIcon) await ImageUploadHelper.delete(sectionIcon);
      sectionIcon = null;
    }

    const heading = r.input('heading');
    const subtitle = r.input('subtitle');
    const results = [];

    for (const [index, title] of entries(r.input('card_title'))) {
      const itemId = r.input(`item_id.${index}`); // null -> new card
      const hasIcon = r.hasFile(`card_icon.${index}`);

      const header = { service_type: type, heading, subtitle, section_icon: sectionIcon };

      if (itemId) {
        // Scope to the service so one type can't edit another's cards.
        const card = await WhyChooseCard.findOne({ where: { service_type: type, id: itemId } });

        if (!card) return fail(res, `Card with id ${itemId} not found for service '${type}'`, 404);

        const updateData = { ...header, card_title: title, order: index };

        if (r.has('is_active')) updateData.is_active = r.boolean('is_active');

        // Card icon: new file -> replace; remove flag -> clear; else keep existing.
        if (hasIcon) {
          if (card.card_icon) await ImageUploadHelper.delete(card.card_icon);
          updateData.card_icon = await ImageUploadHelper.upload(r.file(`card_icon.${index}`), 'why-choose');
        } else if (r.boolean(`remove_card_icon.${index}`)) {
          if (card.card_icon) await ImageUploadHelper.delete(card.card_icon);
          updateData.card_icon = null;
        }

        await card.update(updateData);
        await card.reload();
        results.push(card);
      } else {
        const iconPath = hasIcon
          ? await ImageUploadHelper.upload(r.file(`card_icon.${index}`), 'why-choose')
          : null;

        results.push(await WhyChooseCard.create({
          ...header,
          card_title: title,
          card_icon: iconPath,
          order: index,
          is_active: r.boolean('is_active', true),
        }));
      }
    }

    return ok(res, { success: true, message: 'Why Choose section saved successfully', data: results });
  },

  // DELETE /cms/why-choose/:id
  async destroy(req, res) {
    const card = await WhyChooseCard.findByPk(req.params.id);
    if (!card) return fail(res, 'Card not found', 404);

    if (card.card_icon) await ImageUploadHelper.delete(card.card_icon);
    await card.destroy();

    return ok(res, { success: true, message: 'Card deleted successfully' });
  },

  // GET /app/why-choose - public; active header + active cards in display order
  async app(req, res) {
    const type = serviceType(wrap(req));
    const cards = await WhyChooseCard.findAll({
      where: { service_type: type, is_active: true },
      order: [['order', 'ASC'], ['id', 'ASC']],
    });
    const first = cards[0];

    return ok(res, {
      success: true,
      data: {
        service_type: type,
        heading: nz(first && first.heading, HEADING_DEFAULT),
        subtitle: nz(first && first.subtitle, null),
        section_icon: nz(first && first.section_icon, null),
        cards: cards.map((c) => ({ id: c.id, card_title: c.card_title, card_icon: c.card_icon })),
      },
    });
  },
};
