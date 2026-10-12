// Port of App\Http\Controllers\Auth\AuthController
const { Op } = require('sequelize');
const { User, Role, Permission } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const { createToken } = require('../../middleware/auth');

module.exports = {
  /** LOGIN (Email OR Phone) */
  async login(req, res) {
    await validate(req, {
      login: 'required|string',
      password: 'required|string',
    });

    const login = req.input('login');

    // Email or phone login
    const user = await User.findOne({
      where: { [Op.or]: [{ email: login }, { phone: login }] },
      include: [{ model: Role, as: 'role', include: [{ model: Permission, as: 'permissions', required: false }] }],
    });

    if (!user || !hash.check(req.input('password'), user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = await createToken(user, 'api-token');

    return res.json({
      message: 'Login successful',
      token,
      user: (() => {
        // belongsToMany pivots serialise under `pivot` in Eloquent
        const j = user.toJSON();
        if (j.role && j.role.permissions) j.role = require('../roles/role.controller').withPivot({ toJSON: () => j.role });
        return j;
      })(),
    });
  },

  /** LOGOUT (current device) */
  async logout(req, res) {
    await req.accessToken.destroy();

    return res.json({ message: 'Logged out successfully' });
  },

  /** LOGOUT FROM ALL DEVICES */
  async logoutAll(req, res) {
    const { PersonalAccessToken } = require('../../models');
    await PersonalAccessToken.destroy({
      where: { tokenable_type: 'App\\Models\\User', tokenable_id: req.user.id },
    });

    return res.json({ message: 'Logged out from all devices' });
  },
};
