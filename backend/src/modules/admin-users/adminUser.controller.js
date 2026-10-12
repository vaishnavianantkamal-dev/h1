// Port of App\Http\Controllers\Admin\AdminUserController
const { User, Role } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const paginate = require('../../utils/paginate');
const { findOrFail } = require('../../utils/binding');
const { abort } = require('../../utils/errors');

const roleId = async (slug) => {
  const role = await Role.findOne({ where: { slug }, attributes: ['id'] });
  return role ? role.id : null;
};

module.exports = {
  async index(req, res) {
    const adminRoleId = await roleId('super-admin');
    return res.json(await User.findAll({ where: { role_id: adminRoleId }, order: [['created_at', 'DESC']] }));
  },

  async store(req, res) {
    await validate(req, {
      name: 'required',
      phone: 'required|unique:users',
      password: 'required|min:6',
    });

    // 'role' => 'admin' is not a fillable column in Laravel either (dropped by mass assignment)
    await User.create({
      name: req.input('name'),
      phone: req.input('phone'),
      password: hash.make(req.input('password')),
    });

    return res.json({ message: 'Admin created' });
  },

  async users(req, res) {
    const perPage = parseInt(req.input('per_page', 20), 10) || 15; // default 20; paginate(0) falls back to the model default (15)
    if (perPage < 0) throw new Error('SQLSTATE: LIMIT -1'); // paginate(-1) => negative LIMIT => QueryException (500)

    return res.json(await paginate(User, req, {
      include: [{ model: Role, as: 'role', required: false }],
      order: [['id', 'ASC']],
      perPage,
    }));
  },

  async destroy(req, res) {
    const user = await findOrFail(User, req.params.user);

    // Allow only super-admin
    if (!req.user.hasRole('super-admin')) {
      abort(403, 'Only super-admin can delete admin users');
    }
    const adminRoleId = await roleId('super-admin');
    // Prevent deleting super-admin itself
    if (user.role_id !== null && adminRoleId !== null && Number(user.role_id) === Number(adminRoleId)) {
      abort(403, 'Super-admin cannot be deleted');
    }

    await user.destroy();

    return res.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  },
};
