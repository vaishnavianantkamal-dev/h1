// Port of app/Http/Controllers/CMS/CmsChooseUsController.php
const { ChooseUs } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, entries } = require('./cmsHelpers');

const notFound = (res) => fail(res, 'Choose us card not found', 404);

module.exports = {
  // GET /cms/choose-us
  async index(req, res) {
    const chooseUs = await ChooseUs.findAll({ where: { is_active: true }, order: [['order', 'ASC']] });
    return ok(res, { success: true, data: chooseUs });
  },

  // POST /cms/choose-us - parallel arrays card_heading[] / card_image[]
  async store(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      heading: 'required|string|max:255',
      is_active: 'boolean',

      card_heading: 'required|array|min:1',
      'card_heading.*': 'required|string|max:255',

      card_image: 'required|array|min:1',
      'card_image.*': IMG,
    });
    if (v.errors) return invalid(res, v.errors);

    const cards = [];
    for (const [index, heading] of entries(r.input('card_heading'))) {
      let imagePath = null;

      if (r.hasFile(`card_image.${index}`)) {
        imagePath = await ImageUploadHelper.upload(r.file(`card_image.${index}`), 'choose-us');
      }

      cards.push(await ChooseUs.create({
        heading: r.input('heading'),
        card_heading: heading,
        image: imagePath,
        order: index,
        is_active: r.boolean('is_active', true),
      }));
    }

    return ok(res, { success: true, message: 'Choose Us cards created successfully', data: cards }, 201);
  },

  // GET /cms/choose-us/:choose_us
  async show(req, res) {
    const chooseUs = await ChooseUs.findByPk(req.params.choose_us);
    if (!chooseUs) return notFound(res);
    return ok(res, { success: true, data: chooseUs });
  },

  // PUT/PATCH /cms/choose-us/:choose_us
  async update(req, res) {
    const chooseUs = await ChooseUs.findByPk(req.params.choose_us);
    if (!chooseUs) return notFound(res);

    const r = wrap(req);
    const v = await r.validate({
      heading: 'sometimes|string|max:255',
      card_heading: 'sometimes|string|max:255',
      order: 'sometimes|integer',
      is_active: 'sometimes|boolean',
      image: ['sometimes', 'nullable', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    if (r.hasFile('image')) {
      if (chooseUs.image) await ImageUploadHelper.delete(chooseUs.image);
      data.image = await ImageUploadHelper.upload(r.file('image'), 'choose-us');
    } else {
      delete data.image;
    }

    await chooseUs.update(data);
    await chooseUs.reload();
    return ok(res, { success: true, message: 'Choose us card updated successfully', data: chooseUs });
  },

  // POST /cms/choose-us-bulk
  async bulkUpdate(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      heading: 'sometimes|string|max:255',
      is_active: 'sometimes|boolean',

      card_id: 'sometimes|array',
      'card_id.*': 'nullable|integer|exists:choose_us,id',

      card_heading: 'required|array|min:1',
      'card_heading.*': 'required|string|max:255',

      card_image: 'sometimes|array',
      'card_image.*': ['nullable', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);

    const results = [];

    for (const [index, heading] of entries(r.input('card_heading'))) {
      const cardId = r.input(`card_id.${index}`); // null -> new card
      const hasImage = r.hasFile(`card_image.${index}`);

      if (cardId) {
        const chooseUs = await ChooseUs.findByPk(cardId);
        if (!chooseUs) return fail(res, `Card with id ${cardId} not found`, 404);

        const updateData = { card_heading: heading, order: index };

        if (r.has('heading')) updateData.heading = r.input('heading');
        if (r.has('is_active')) updateData.is_active = r.boolean('is_active');

        // Replace image only when a new file is provided
        if (hasImage) {
          if (chooseUs.image) await ImageUploadHelper.delete(chooseUs.image);
          updateData.image = await ImageUploadHelper.upload(r.file(`card_image.${index}`), 'choose-us');
        }

        await chooseUs.update(updateData);
        await chooseUs.reload();
        results.push(chooseUs);
      } else {
        // New cards MUST have an image
        if (!hasImage) {
          return fail(res, `card_image.${index} is required for new cards (no card_id provided)`, 422);
        }

        const imagePath = await ImageUploadHelper.upload(r.file(`card_image.${index}`), 'choose-us');

        results.push(await ChooseUs.create({
          heading: r.input('heading') ?? '',
          card_heading: heading,
          image: imagePath,
          order: index,
          is_active: r.boolean('is_active', true),
        }));
      }
    }

    return ok(res, { success: true, message: 'Choose Us cards saved successfully', data: results });
  },

  // DELETE /cms/choose-us/:choose_us
  async destroy(req, res) {
    const chooseUs = await ChooseUs.findByPk(req.params.choose_us);
    if (!chooseUs) return notFound(res);

    if (chooseUs.image) await ImageUploadHelper.delete(chooseUs.image);
    await chooseUs.destroy();

    return ok(res, { success: true, message: 'Choose us card deleted successfully' });
  },
};
