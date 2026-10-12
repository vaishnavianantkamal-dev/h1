// Port of app/Http/Controllers/CMS/CmsSubscriptionPolicyController.php
const { SubscriptionPolicy, sequelize, Op } = require('../../models');
const { wrap, ok, fail, invalid, entries, nz, bool, serviceType } = require('./cmsHelpers');

const HEADING_DEFAULT = 'Subscription Rules & Policies';

const ORDER = [['group_order', 'ASC'], ['point_order', 'ASC'], ['id', 'ASC']];

// Collapse flat bullet rows back into nested groups, preserving order (Collection::groupBy('group_order')).
function regroup(rows, includeActive = false) {
  const groups = new Map();
  for (const r of rows) {
    const key = r.group_order;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return [...groups.values()].map((groupRows) => {
    const first = groupRows[0];
    return {
      title: first.group_title,
      order: first.group_order,
      points: groupRows.map((r) => {
        const point = { id: r.id, text: r.point_text };
        if (includeActive) point.is_active = r.is_active;
        return point;
      }),
    };
  });
}

module.exports = {
  // GET /cms/subscription-policies?type=cleaner|cook - heading + ALL rows regrouped into nested form
  async index(req, res) {
    const type = serviceType(wrap(req));
    const rows = await SubscriptionPolicy.findAll({ where: { service_type: type }, order: ORDER });

    return ok(res, {
      success: true,
      data: {
        service_type: type,
        heading: nz(rows[0] && rows[0].heading, HEADING_DEFAULT),
        groups: regroup(rows, true),
      },
    });
  },

  // POST /cms/subscription-policies-bulk - nested save, flattened to rows. The submitted list is the
  // source of truth: any existing bullet of this service whose id is NOT in the payload is deleted.
  async bulkSave(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      heading: 'required|string|max:255',
      groups: 'required|array|min:1',
      'groups.*.title': 'required|string|max:255',
      'groups.*.order': 'sometimes|integer',
      'groups.*.is_active': 'sometimes|boolean',
      'groups.*.points': 'required|array|min:1',
      'groups.*.points.*.id': 'nullable|integer|exists:subscription_policies,id',
      'groups.*.points.*.text': 'required|string',
    });
    if (v.errors) return invalid(res, v.errors);

    const type = serviceType(r);
    const heading = r.input('heading');
    const keptIds = [];

    await sequelize.transaction(async (t) => {
      for (const [gIndex, group] of entries(r.input('groups'))) {
        const groupOrder = nz(group.order, gIndex);
        const groupActive = Object.prototype.hasOwnProperty.call(group, 'is_active') ? bool(group.is_active) : true;

        for (const [pIndex, point] of entries(group.points)) {
          const attributes = {
            service_type: type,
            heading,
            group_title: group.title,
            group_order: groupOrder,
            point_text: point.text,
            point_order: pIndex,
            is_active: groupActive,
          };

          // Only reuse an id that belongs to THIS service; a stale/other-type id falls through to
          // create so we never hijack another service's row.
          let row = point.id && point.id !== '0'
            ? await SubscriptionPolicy.findOne({ where: { service_type: type, id: point.id }, transaction: t })
            : null;

          if (row) {
            await row.update(attributes, { transaction: t });
          } else {
            row = await SubscriptionPolicy.create(attributes, { transaction: t });
          }

          keptIds.push(row.id);
        }
      }

      // Delete-omitted, SCOPED to this service: other services are untouched.
      await SubscriptionPolicy.destroy({
        where: { service_type: type, ...(keptIds.length ? { id: { [Op.notIn]: keptIds } } : {}) },
        transaction: t,
      });
    });

    const rows = await SubscriptionPolicy.findAll({ where: { service_type: type }, order: ORDER });

    return ok(res, {
      success: true,
      message: 'Subscription policies saved successfully',
      data: { service_type: type, heading, groups: regroup(rows, true) },
    });
  },

  // DELETE /cms/subscription-policies/:id - remove a single bullet row
  async destroy(req, res) {
    const row = await SubscriptionPolicy.findByPk(req.params.id);
    if (!row) return fail(res, 'Policy point not found', 404);

    await row.destroy();
    return ok(res, { success: true, message: 'Policy point deleted successfully' });
  },

  // GET /app/subscription-policies - public; heading + active groups with active points
  async app(req, res) {
    const type = serviceType(wrap(req));
    const rows = await SubscriptionPolicy.findAll({ where: { service_type: type, is_active: true }, order: ORDER });

    return ok(res, {
      success: true,
      data: {
        service_type: type,
        heading: nz(rows[0] && rows[0].heading, HEADING_DEFAULT),
        groups: regroup(rows),
      },
    });
  },
};
