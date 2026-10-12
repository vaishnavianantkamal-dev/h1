// Port of app/Http/Controllers/CMS/CmsHowWorkController.php
const { HowWork, Op } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, assigned, entries, nz, whereNotInIds } = require('./cmsHelpers');

const notFound = (res) => fail(res, 'How it works card not found', 404);

module.exports = {
  // GET /cms/how-works
  async index(req, res) {
    const howWorks = await HowWork.findAll({ where: { is_active: true }, order: [['order', 'ASC']] });
    return ok(res, { success: true, data: howWorks });
  },

  // POST /cms/how-works - brand-new cards only, image required for each card
  async store(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      is_active: 'boolean',
      cards: 'required|array|min:1',
      'cards.*.step': 'required|integer',
      'cards.*.title': 'required|string|max:255',
      'cards.*.subtitle': 'required|string|max:500',
      'cards.*.image': ['required', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);

    const created = [];
    for (const [index, card] of entries(r.input('cards'))) {
      let image = null;
      if (r.hasFile(`cards.${index}.image`)) {
        image = await ImageUploadHelper.upload(r.file(`cards.${index}.image`), 'how-works');
      }

      const attrs = {
        short_heading: r.input('short_heading'),
        heading: r.input('heading'),
        description: r.input('description'),
        step: card.step,
        title: card.title,
        subtitle: card.subtitle,
        image,
        order: index,
        is_active: r.boolean('is_active', true),
      };
      created.push(assigned(await HowWork.create(attrs), attrs));
    }

    return ok(res, { success: true, message: 'How it works cards created successfully', data: created }, 201);
  },

  // GET /cms/how-works/:how_work
  async show(req, res) {
    const howWork = await HowWork.findByPk(req.params.how_work);
    if (!howWork) return notFound(res);
    return ok(res, { success: true, data: howWork });
  },

  // PUT/PATCH /cms/how-works/:how_work - image optional
  async update(req, res) {
    const howWork = await HowWork.findByPk(req.params.how_work);
    if (!howWork) return notFound(res);

    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      step: 'sometimes|integer',
      title: 'sometimes|string|max:255',
      subtitle: 'sometimes|string|max:500',
      order: 'sometimes|integer',
      is_active: 'sometimes|boolean',
      image: ['sometimes', 'nullable', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    // Replace image only when a new file is uploaded
    if (r.hasFile('image')) {
      if (howWork.image) await ImageUploadHelper.delete(howWork.image);
      data.image = await ImageUploadHelper.upload(r.file('image'), 'how-works');
    } else {
      delete data.image; // keep existing image untouched
    }

    await howWork.update(data);
    await howWork.reload();
    return ok(res, { success: true, message: 'How it works card updated successfully', data: howWork });
  },

  // DELETE /cms/how-works/:how_work
  async destroy(req, res) {
    const howWork = await HowWork.findByPk(req.params.how_work);
    if (!howWork) return notFound(res);

    if (howWork.image) await ImageUploadHelper.delete(howWork.image);
    await howWork.destroy();

    return ok(res, { success: true, message: 'How it works card deleted successfully' });
  },

  // POST /cms/how-works-bulk
  //  - cards[N][id] present -> UPDATE that card (image optional)
  //  - cards[N][id] absent  -> CREATE new card  (image required)
  //  - IDs that exist in DB but are NOT in this request -> DELETED
  async bulkUpdate(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      is_active: 'sometimes|boolean',
      cards: 'required|array|min:1',
      'cards.*.id': 'sometimes|nullable|integer|exists:how_works,id',
      'cards.*.step': 'required|integer',
      'cards.*.title': 'required|string|max:255',
      'cards.*.subtitle': 'required|string|max:500',
      // image validated per-card below (required only for new cards)
      'cards.*.image': ['sometimes', 'nullable', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);

    const cards = entries(r.input('cards'));

    // Collect IDs that are being kept
    const incomingIds = cards
      .map(([, c]) => (c && typeof c === 'object' ? c.id : undefined))
      .filter((id) => id)
      .map((id) => parseInt(id, 10));

    // Delete cards that were removed on the frontend
    const toDelete = await HowWork.findAll({ where: whereNotInIds(Op, incomingIds) });
    for (const card of toDelete) {
      if (card.image) await ImageUploadHelper.delete(card.image);
      await card.destroy();
    }

    // Shared section fields (update all existing records too)
    const sectionFields = {};
    const sf = {
      short_heading: nz(r.input('short_heading'), null),
      heading: nz(r.input('heading'), null),
      description: nz(r.input('description'), null),
      is_active: r.has('is_active') ? r.boolean('is_active') : null,
    };
    for (const [k, val] of Object.entries(sf)) if (val !== null) sectionFields[k] = val;

    const results = [];

    for (const [index, card] of cards) {
      const cardId = card && card.id ? parseInt(card.id, 10) : null;
      const hasImage = r.hasFile(`cards.${index}.image`);

      if (cardId) {
        // UPDATE existing card
        const howWork = await HowWork.findByPk(cardId);
        if (!howWork) return fail(res, `Card with id ${cardId} not found`, 404);

        const updateData = {
          ...sectionFields,
          step: card.step,
          title: card.title,
          subtitle: card.subtitle,
          order: index,
        };

        if (hasImage) {
          if (howWork.image) await ImageUploadHelper.delete(howWork.image);
          updateData.image = await ImageUploadHelper.upload(r.file(`cards.${index}.image`), 'how-works');
        }
        // no image key -> existing image preserved automatically

        await howWork.update(updateData);
        await howWork.reload();
        results.push(howWork);
      } else {
        // CREATE new card - new cards MUST have an image
        if (!hasImage) {
          return fail(res, `cards.${index}.image is required when creating a new card (no id provided)`, 422);
        }

        const image = await ImageUploadHelper.upload(r.file(`cards.${index}.image`), 'how-works');

        const attrs = {
          ...sectionFields,
          short_heading: nz(r.input('short_heading'), ''),
          heading: nz(r.input('heading'), ''),
          description: nz(r.input('description'), ''),
          step: card.step,
          title: card.title,
          subtitle: card.subtitle,
          image,
          order: index,
          is_active: r.boolean('is_active', true),
        };
        results.push(assigned(await HowWork.create(attrs), attrs));
      }
    }

    return ok(res, { success: true, message: 'How it works cards saved successfully', data: results });
  },
};
