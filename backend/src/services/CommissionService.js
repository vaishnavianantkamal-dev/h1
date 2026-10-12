// Port of app/Services/CommissionService.php (static)
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

async function calculate(booking) {
  const { Commission, CommissionCalculate } = require('../models');
  const commission = await Commission.findOne({ where: { service_id: booking.service_id, status: 'active' } });

  if (!commission) return 0;

  const amount = Number(booking.amount);
  const companyCommission =
    commission.commission_type === 'fixed' ? Number(commission.value) : (amount * Number(commission.value)) / 100;
  const workerEarning = amount - companyCommission;

  await CommissionCalculate.create({
    booking_id: booking.id,
    service_id: booking.service_id,
    worker_id: booking.worker_id,
    booking_amount: amount,
    company_commission: round2(companyCommission),
    worker_earning: round2(workerEarning),
    commission_type: commission.commission_type,
    commission_value: commission.value,
  });

  return round2(workerEarning);
}

module.exports = { calculate };
