// Port of App\Http\Controllers\Commission\CommissionCalculationController
const { QueryTypes } = require('sequelize');
const { CommissionCalculate, Booking, User, Service, sequelize } = require('../../models');
const paginate = require('../../utils/paginate');

const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const relations = () => [
  { model: Booking, as: 'booking', required: false },
  { model: User, as: 'worker', required: false },
  { model: Service, as: 'service', required: false },
];
const scalar = async (sql) => {
  const [row] = await sequelize.query(sql, { type: QueryTypes.SELECT });
  return row ? Object.values(row)[0] : null;
};

module.exports = {
  async index(req, res) {
    const commissions = await paginate(CommissionCalculate, req, {
      include: relations(),
      order: [['created_at', 'DESC']],
      perPage: 20,
    });
    return res.json({ message: 'commissions Review successfully', commissions });
  },

  async showByBooking(req, res) {
    const commission = await CommissionCalculate.findOne({
      where: { booking_id: req.params.bookingId },
      include: relations(),
    });
    if (!commission) {
      return res.status(404).json({ success: false, message: 'Commission not found for this booking' });
    }
    return res.json({ success: true, data: commission });
  },

  async summary(req, res) {
    const totalRevenue = await scalar("SELECT SUM(amount) AS v FROM bookings WHERE payment_status = 'paid'");
    // Total company commission
    const totalCompanyCommission = await scalar('SELECT SUM(company_commission) AS v FROM commissions');
    // Average commission from category_commissions
    const averageCommission = await scalar('SELECT AVG(value) AS v FROM category_commissions');
    return res.json({
      success: true,
      data: {
        total_revenue: round2(totalRevenue),
        total_company_commission: round2(totalCompanyCommission),
        average_commission: round2(averageCommission),
      },
    });
  },
};
