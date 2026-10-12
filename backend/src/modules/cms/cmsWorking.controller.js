// Port of app/Http/Controllers/CMS/CmsWorkingController.php
const { Working } = require('../../models');
const { wrap, ok, fail, entries, nz } = require('./cmsHelpers');
const { HttpError } = require('../../utils/errors');

const notFound = (res) => fail(res, 'Working card not found', 404);

module.exports = {
  // GET /cms/workings
  async index(req, res) {
    const workings = await Working.findAll({ where: { is_active: true }, order: [['order', 'ASC']] });
    return ok(res, { success: true, data: workings });
  },

  // POST /cms/workings - parallel arrays card_title[] / card_subtitle[]
  async store(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      is_active: 'boolean',

      card_title: 'required|array|min:1',
      'card_title.*': 'required|string|max:255',

      card_subtitle: 'required|array|min:1',
      'card_subtitle.*': 'required|string|max:255',
    });
    if (v.errors) return res.status(422).json({ success: false, message: 'Validation error', errors: v.errors });

    const created = [];
    for (const [index, title] of entries(r.input('card_title'))) {
      created.push(await Working.create({
        short_heading: r.input('short_heading'),
        heading: r.input('heading'),
        description: String(nz(r.input('description'), '')).trim(),
        card_title: title,
        card_subtitle: nz(r.input(`card_subtitle.${index}`), null),
        order: index,
        // $request->is_active ?? true  (raw value, no boolean cast)
        is_active: nz(r.input('is_active'), true),
      }));
    }

    return ok(res, { success: true, message: 'Working cards created successfully', data: created }, 201);
  },

  // GET /cms/workings/:working
  async show(req, res) {
    const working = await Working.findByPk(req.params.working);
    if (!working) return notFound(res);
    return ok(res, { success: true, data: working });
  },

  // PUT/PATCH /cms/workings/:working - note: PHP ignores the route id; it updates by short_heading + card_id[]
  async update(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      is_active: 'boolean',

      card_id: 'array',
      'card_id.*': 'exists:workings,id',
      card_title: 'array',
      card_subtitle: 'array',
    });
    // NOTE: this validation failure has no 'message' key in the PHP response
    if (v.errors) return res.status(422).json({ success: false, errors: v.errors });

    // Update parent info for ALL cards in this section
    await Working.update({
      heading: nz(r.input('heading'), null),
      description: String(nz(r.input('description'), '')).trim(),
      is_active: nz(r.input('is_active'), null),
    }, { where: { short_heading: nz(r.input('short_heading'), null) } });

    // Update cards (optional - the parent info above may be edited on its own)
    const cardIds = r.input('card_id');
    for (const [index, cardId] of (cardIds !== null && typeof cardIds === 'object' ? entries(cardIds) : [])) {
      await Working.update({
        card_title: nz(r.input(`card_title.${index}`), null),
        card_subtitle: nz(r.input(`card_subtitle.${index}`), null),
        order: index,
      }, { where: { id: cardId } });
    }

    return ok(res, { success: true, message: 'Working section updated successfully' });
  },

  // DELETE /cms/workings/:working
  async destroy(req, res) {
    const working = await Working.findByPk(req.params.working);
    if (!working) return notFound(res);

    await working.destroy();
    return ok(res, { success: true, message: 'Working card deleted successfully' });
  },
};
