// Port of App\Http\Controllers\Api\CustomerServicePlanController
// Customer-facing read of a service's billing plans with prices resolved for the logged-in customer (member vs normal).
const { Service, ServicePlan } = require('../../models');
const { findOrFail } = require('../../utils/binding');

// HasResolvablePrice::pricePayload (used when the model does not provide it)
function pricePayload(row, isMember) {
  if (typeof row.pricePayload === 'function') return row.pricePayload(isMember);
  const has = (v) => v !== null && v !== undefined;
  const payload = { is_member: isMember };
  if (isMember) payload.member_price = has(row.member_price) ? parseFloat(row.member_price) : parseFloat(row.price);
  else payload.price = parseFloat(row.price);
  payload.festival_price = has(row.festival_price) ? parseFloat(row.festival_price) : null;
  return payload;
}

module.exports = {
  /** GET /api/customer/services/{service}/plans */
  async index(req, res) {
    const service = await findOrFail(Service, req.params.service);
    const isMember = await req.user.isMember();

    const rows = await ServicePlan.findAll({ where: { service_id: service.id }, order: [['duration_days', 'ASC']] });
    const plans = rows.map((plan) => ({
      id: plan.id,
      name: plan.name,
      duration_days: plan.duration_days,
      original_price: parseFloat(plan.price),
      ...pricePayload(plan, isMember),
    }));

    res.json({
      success: true,
      is_member: isMember,
      service: {
        id: service.id,
        name: service.name,
        duration_minutes: service.duration_minutes,
      },
      service_pricing: { original_price: parseFloat(service.price), ...pricePayload(service, isMember) },
      plans,
    });
  },
};
