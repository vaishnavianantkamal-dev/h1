// Port of App\Http\Controllers\Roles\RolePermissionController
const { Role, Permission } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { withPivot } = require('./role.controller');

module.exports = {
  async edit(req, res) {
    const role = await findOrFail(Role, req.params.role, { include: [{ model: Permission, as: 'permissions', required: false }] });
    const assigned = role.permissions || [];

    return res.json({
      role: withPivot(role),
      permissions: await Permission.findAll(),
      assigned: assigned.map((p) => p.id),
    });
  },

  async update(req, res) {
    const role = await findOrFail(Role, req.params.role);

    await validate(req, {
      permission_ids: 'array',
    });

    // $role->permissions()->sync($request->permission_ids)  (null => detach all)
    const ids = req.input('permission_ids');
    await role.setPermissions(Array.isArray(ids) ? ids : []);

    return res.json({ message: 'Permissions updated' });
  },
};
