// Port of app/Http/Controllers/CMS/CmsBookingInstructionController.php
// Relation: BookingInstruction.belongsToMany(SubscriptionType, as 'subscriptions') via booking_instruction_subscription.
const { BookingInstruction, SubscriptionType, sequelize, Op } = require('../../models');
const { wrap, ok, invalid, nz } = require('./cmsHelpers');
const { abort } = require('../../utils/errors');

// with('subscriptions:id,name')
const withSubscriptions = () => ({
  model: SubscriptionType,
  as: 'subscriptions',
  attributes: ['id', 'name'],
  through: { attributes: [] },
});

// whereHas('subscriptions', fn => where('subscription_type.id', $id)) - subquery so the eager-loaded
// subscriptions are NOT restricted to the filtered one (Eloquent whereHas semantics).
const hasSubscription = (subscriptionId) =>
  sequelize.literal(
    `\`${BookingInstruction.name}\`.\`id\` IN (SELECT booking_instruction_id FROM booking_instruction_subscription WHERE subscription_id = ${sequelize.escape(subscriptionId)})`
  );

// Route model binding: {bookingInstruction}
async function bind(req, opts = {}) {
  const id = req.params.bookingInstruction;
  const row = await BookingInstruction.findByPk(id, opts);
  if (!row) abort(404, `No query results for model [App\\Models\\Cms\\BookingInstruction] ${id}`);
  return row;
}

const loadWithSubscriptions = (id) => BookingInstruction.findByPk(id, { include: [withSubscriptions()] });

// Shape one row for the admin response, exposing subscription_ids for the multiselect to pre-select.
const transform = (row) => {
  const subs = row.subscriptions || [];
  return {
    id: row.id,
    text: row.text,
    order: row.order,
    is_active: row.is_active,
    subscription_ids: subs.map((s) => s.id),
    subscriptions: subs.map((s) => ({ id: s.id, name: s.name })),
  };
};

// Validate the create/update payload. `subscription_ids` is the multiselect.
async function validatePayload(req) {
  const v = await wrap(req).validate({
    text: 'required|string',
    order: 'nullable|integer|min:0',
    is_active: 'nullable|boolean',
    subscription_ids: 'required|array|min:1',
    'subscription_ids.*': 'integer|exists:subscription_type,id',
  });
  if (v.errors) return { errors: v.errors };

  const data = v.data;
  data.subscription_ids = [...new Set(Object.values(data.subscription_ids).map((x) => parseInt(x, 10) || 0))];
  return { data };
}

module.exports = {
  // GET /cms/booking-instructions[?subscription_id=3]
  async index(req, res) {
    const r = wrap(req);
    const query = { include: [withSubscriptions()], order: [['order', 'ASC'], ['id', 'ASC']] };

    if (r.filled('subscription_id')) {
      query.where = hasSubscription(parseInt(r.input('subscription_id'), 10) || 0);
    }

    const rows = await BookingInstruction.findAll(query);
    return ok(res, { success: true, data: rows.map(transform) });
  },

  // POST /cms/booking-instructions
  async store(req, res) {
    const p = await validatePayload(req);
    if (p.errors) return invalid(res, p.errors);
    const data = p.data;

    const instruction = await BookingInstruction.create({
      text: data.text,
      order: nz(data.order, 0),
      is_active: nz(data.is_active, true),
    });

    await instruction.setSubscriptions(data.subscription_ids);

    return ok(res, {
      success: true,
      message: 'Booking instruction created successfully.',
      data: transform(await loadWithSubscriptions(instruction.id)),
    }, 201);
  },

  // GET /cms/booking-instructions/:bookingInstruction
  async show(req, res) {
    const row = await bind(req);
    return ok(res, { success: true, data: transform(await loadWithSubscriptions(row.id)) });
  },

  // PUT/PATCH /cms/booking-instructions/:bookingInstruction
  async update(req, res) {
    const row = await bind(req);
    const p = await validatePayload(req);
    if (p.errors) return invalid(res, p.errors);
    const data = p.data;

    await row.update({
      text: data.text,
      order: nz(data.order, row.order),
      is_active: nz(data.is_active, row.is_active),
    });

    await row.setSubscriptions(data.subscription_ids);

    return ok(res, {
      success: true,
      message: 'Booking instruction updated successfully.',
      data: transform(await loadWithSubscriptions(row.id)),
    });
  },

  // PATCH /cms/booking-instructions/:bookingInstruction/toggle
  async toggle(req, res) {
    const row = await bind(req);
    await row.update({ is_active: !row.is_active });

    return ok(res, {
      success: true,
      message: 'Status updated.',
      data: transform(await loadWithSubscriptions(row.id)),
    });
  },

  // DELETE /cms/booking-instructions/:bookingInstruction (pivot rows cascade in the DB)
  async destroy(req, res) {
    const row = await bind(req);
    await row.destroy();

    return ok(res, { success: true, message: 'Booking instruction deleted successfully.' });
  },

  // GET /app/booking-instructions?subscription_id=3 - public; active instructions for the subscription
  async app(req, res) {
    const r = wrap(req);
    const v = await r.validate({ subscription_id: 'required|integer|exists:subscription_type,id' });
    if (v.errors) return invalid(res, v.errors);

    const subscriptionId = parseInt(r.input('subscription_id'), 10);

    const rows = await BookingInstruction.findAll({
      where: { is_active: true, [Op.and]: [hasSubscription(subscriptionId)] },
      order: [['order', 'ASC'], ['id', 'ASC']],
    });

    return ok(res, {
      success: true,
      data: {
        subscription_id: subscriptionId,
        heading: 'Booking Instructions',
        instructions: rows.map((row, i) => ({ id: row.id, order: i + 1, text: row.text })),
      },
    });
  },
};
