// Port of App\Http\Controllers\Admin\CustomerController
const { Op, literal } = require('sequelize');
const sequelize = require('../../config/db');
const { User, Role, Customer, City, Booking, BookingService } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const paginate = require('../../utils/paginate');
const { HttpError } = require('../../utils/errors');
const { getScopedCityId } = require('../../utils/cityScoped');
const { dayjs } = require('../../utils/time');

const roleId = async (slug) => {
  const role = await Role.findOne({ where: { slug }, attributes: ['id'] });
  return role ? role.id : null;
};

module.exports = {
  async index(req, res) {
    const customerRoleId = await roleId('customers');

    return res.json(await paginate(User, req, {
      where: { role_id: customerRoleId },
      include: [{ model: Customer, as: 'customer', required: false }],
      order: [['created_at', 'DESC']],
      perPage: 20,
    }));
  },

  /**
   * GET /admin/members
   * List customers who are currently ACTIVE members - i.e. they have a paid,
   * non-cancelled booking with a monthly subscription whose end_date is in the
   * future. Membership is derived live (see User::isMember).
   *
   * membership_valid_until (the furthest active end_date) is computed in a single
   * correlated subquery. Optional ?search= filters by name or phone.
   */
  async members(req, res) {
    const customerRoleId = await roleId('customers');

    // City-admins/coordinators see only their own city; super-admin sees all
    // (or an optional ?city_id= filter). A customer belongs to a city by their
    // BOOKING's city - not users.city_id - matching customersWithBookings.
    const cityId = getScopedCityId(req);

    const subTypes = BookingService.SUBSCRIPTION_TYPES || ['Monthly Subscription', 'monthly'];
    const paid = Booking.PAYMENT_PAID || 'paid';
    const today = dayjs().format('YYYY-MM-DD');
    const esc = (v) => sequelize.escape(v);
    const typeList = subTypes.map(esc).join(',');
    const cityClause = cityId ? ` AND bookings.city_id = ${esc(cityId)}` : '';

    const validUntilSub = '(SELECT MAX(booking_services.end_date) FROM booking_services '
      + 'INNER JOIN bookings ON bookings.id = booking_services.booking_id '
      + 'WHERE bookings.customer_id = User.id '
      + `AND booking_services.booking_type IN (${typeList}) `
      + `AND DATE(booking_services.end_date) >= ${esc(today)} `
      + `AND bookings.payment_status = ${esc(paid)} `
      + `AND bookings.status NOT IN ('cancelled')${cityClause})`;

    // whereHas('customerBookings', activeMembership + city)
    const memberExists = 'EXISTS (SELECT 1 FROM bookings WHERE bookings.customer_id = User.id '
      + `AND bookings.payment_status = ${esc(paid)} AND bookings.status NOT IN ('cancelled') `
      + 'AND EXISTS (SELECT 1 FROM booking_services WHERE booking_services.booking_id = bookings.id '
      + `AND booking_services.booking_type IN (${typeList}) AND DATE(booking_services.end_date) >= ${esc(today)})`
      + `${cityClause})`;

    const and = [literal(memberExists)];
    if (customerRoleId) and.push({ role_id: customerRoleId });

    const search = String(req.query.search ?? '').trim();
    if (search) {
      and.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      });
    }

    const perPage = 20;
    const page = Math.max(parseInt(req.query.page ?? 1, 10) || 1, 1);
    const where = { [Op.and]: and };
    const total = await User.count({ where });
    const rows = await User.findAll({
      where,
      attributes: { include: [[literal(validUntilSub), 'membership_valid_until']] },
      include: [{ model: City, as: 'city', attributes: ['id', 'name'], required: false }],
      order: [[literal('membership_valid_until'), 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    return res.json(paginate.build(rows, total, page, perPage, req));
  },

  async store(req, res) {
    await validate(req, {
      name: 'required',
      phone: 'required|unique:users',
      city_id: 'nullable|exists:cities,id',
    });

    const customerRoleId = await roleId('customers');

    const user = await User.create({
      name: req.input('name'),
      phone: req.input('phone'),
      password: hash.make('123456'),
      role_id: customerRoleId,
      city_id: req.input('city_id'),
    });

    await Customer.create({
      user_id: user.id,
      address: req.input('address'),
    });

    return res.json({ message: 'Customer created' });
  },

  // GET /admin/customers/:id (the PHP controller had no show() - the route always returned 500)
  async show(req, res) {
    const customerRoleId = await roleId('customers');
    const user = await User.findOne({ where: { id: req.params.id, role_id: customerRoleId }, include: [{ model: Customer, as: 'customer', required: false }, { model: City, as: 'city', required: false }] });
    if (!user) throw new HttpError(404, 'No query results for model [App\\Models\\User] ' + req.params.id);
    return res.json(user);
  },

  // DELETE /admin/customers/:id - soft delete + deactivate (recoverable; the PHP route always returned 500)
  async destroy(req, res) {
    const customerRoleId = await roleId('customers');
    const user = await User.findOne({ where: { id: req.params.id, role_id: customerRoleId } });
    if (!user) throw new HttpError(404, 'No query results for model [App\\Models\\User] ' + req.params.id);
    await user.update({ is_active: false });
    await user.destroy();
    return res.json({ message: 'Customer deleted' });
  },
};
