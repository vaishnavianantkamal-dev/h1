// Port of App\Http\Controllers\Admin\InstantHelpCardController
const { InstantHelpCard } = require('../../models');
const storage = require('../../utils/storage');
const { findOrFail } = require('../../utils/binding');
const { validateEx, afterOrEqual, dropNulls, pick, labelOf, castDateTime, castBool, castInt } = require('../catalog/support');
const { instantHelpCardResource, instantHelpCardCollection } = require('./resources');

const TRIGGER_TYPES = ['promo', 'morning', 'evening', 'worker_resting', 'see_you_tomorrow'];
const FILLABLE = [
  'title', 'subtitle', 'image', 'action_type', 'action_value', 'is_active', 'start_date', 'end_date',
  'trigger_type', 'start_hour', 'end_hour', 'priority',
];

async function validatePayload(req) {
  const data = await validateEx(req, {
    title: 'nullable|string|max:255',
    subtitle: 'nullable|string|max:255',
    image: 'nullable|image|max:4096',
    action_type: 'nullable|in:none,category,service,subscription,external_url,screen',
    action_value: 'nullable|string|max:255',
    is_active: 'nullable|boolean',
    start_date: 'nullable|date',
    end_date: 'nullable|date',
    trigger_type: 'nullable|in:' + TRIGGER_TYPES.join(','),
    // Contextual slots (anything but 'promo') need a clock window; required_unless:trigger_type,promo (below)
    start_hour: 'nullable|integer|min:0|max:23',
    end_hour: 'nullable|integer|min:0|max:23',
    priority: 'nullable|integer|min:0',
  }, {}, async (d) => {
    const errors = {};
    afterOrEqual(d, 'end_date', 'start_date', errors);
    ['start_hour', 'end_hour'].forEach((f) => {
      const empty = d[f] === null || d[f] === undefined || d[f] === '';
      if (empty && d.trigger_type !== 'promo') {
        (errors[f] ||= []).push(`The ${labelOf(f)} field is required unless trigger type is in promo.`);
      }
    });
    return errors;
  });

  // Drop nulls so a partial update doesn't wipe existing values.
  const out = dropNulls(data);
  if (out.start_date !== undefined) out.start_date = castDateTime(out.start_date);
  if (out.end_date !== undefined) out.end_date = castDateTime(out.end_date);
  return out;
}

module.exports = {
  /** GET /api/admin/instant-cards - every configured banner (promo + contextual slots). */
  async index(req, res) {
    const cards = await InstantHelpCard.findAll({ order: [['priority', 'ASC'], ['id', 'DESC']] });
    res.json({ success: true, data: instantHelpCardCollection(cards) });
  },

  /** POST /api/admin/instant-cards */
  async store(req, res) {
    const data = await validatePayload(req);

    const file = (req.files || []).find((f) => f.fieldname === 'image') || req.file;
    if (file) data.image = storage.storePublic(file, 'instant-help');

    const attrs = pick(data, FILLABLE);
    const card = await InstantHelpCard.create(attrs);

    // Eloquent create() does not read DB defaults back: the resource only sees the attributes that were passed in.
    const cast = { is_active: castBool, start_hour: castInt, end_hour: castInt, priority: castInt };
    const shown = { id: card.id };
    FILLABLE.forEach((k) => { shown[k] = attrs[k] === undefined ? null : (cast[k] ? cast[k](attrs[k]) : attrs[k]); });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully.',
      data: instantHelpCardResource(shown),
    });
  },

  /** POST /api/admin/instant-cards/{card} - image is optional on update. */
  async update(req, res) {
    const card = await findOrFail(InstantHelpCard, req.params.card);
    const data = await validatePayload(req);

    const file = (req.files || []).find((f) => f.fieldname === 'image') || req.file;
    if (file) {
      if (card.image) storage.deletePublic(card.image);
      data.image = storage.storePublic(file, 'instant-help');
    }

    await card.update(pick(data, FILLABLE));

    res.json({
      success: true,
      message: 'Banner updated successfully.',
      data: instantHelpCardResource(await InstantHelpCard.findByPk(card.id)),
    });
  },

  /** PATCH /api/admin/instant-cards/{card}/toggle */
  async toggle(req, res) {
    const card = await findOrFail(InstantHelpCard, req.params.card);
    await card.update({ is_active: !card.is_active });

    res.json({
      success: true,
      message: 'Status updated.',
      data: instantHelpCardResource(await InstantHelpCard.findByPk(card.id)),
    });
  },

  /** DELETE /api/admin/instant-cards/{card} */
  async destroy(req, res) {
    const card = await findOrFail(InstantHelpCard, req.params.card);
    if (card.image) storage.deletePublic(card.image);
    await card.destroy();

    res.json({ success: true, message: 'Banner deleted successfully.' });
  },
};
