// Port of App\Http\Controllers\Roles\RoleController
const { Role, Permission, User } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');

// Illuminate\Support\Str::slug($title)
function slug(title) {
  const s = String(title ?? '')
    .replace(/[øØæÆœŒßđĐłŁðÐþÞ]/g, (c) => ({ 'ø': 'o', 'Ø': 'O', 'æ': 'ae', 'Æ': 'AE', 'œ': 'oe', 'Œ': 'OE', 'ß': 'ss', 'đ': 'd', 'Đ': 'D', 'ł': 'l', 'Ł': 'L', 'ð': 'd', 'Ð': 'D', 'þ': 'th', 'Þ': 'TH' }[c]))
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/@/g, '-at-')
    .toLowerCase()
    .replace(/[_\-]+/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-');
  return s.replace(/^-+|-+$/g, '');
}

// Eloquent serialises belongsToMany pivots under "pivot"
const withPivot = (role) => {
  const json = role.toJSON();
  (json.permissions || []).forEach((p) => {
    for (const k of Object.keys(p)) {
      if (p[k] && typeof p[k] === 'object' && 'role_id' in p[k] && 'permission_id' in p[k]) {
        p.pivot = { role_id: p[k].role_id, permission_id: p[k].permission_id };
        delete p[k];
      }
    }
  });
  return json;
};

module.exports = {
  async index(req, res) {
    return res.json(await Role.findAll({ order: [['created_at', 'DESC']] }));
  },

  async store(req, res) {
    await validate(req, {
      name: 'required|string|unique:roles,name',
      description: 'nullable|string',
    });

    const role = await Role.create({
      name: req.input('name'),
      slug: slug(req.input('name')),
      description: req.input('description'),
    });
    // Eloquent create(): only the assigned attributes + id + timestamps are present
    const j = role.toJSON();
    const out = {};
    for (const k of ['name', 'slug', 'description', 'updated_at', 'created_at', 'id']) out[k] = j[k];
    return res.status(201).json(out);
  },

  async show(req, res) {
    const role = await findOrFail(Role, req.params.role, {
      include: [{ model: Permission, as: 'permissions', required: false }],
    });
    return res.json(withPivot(role));
  },

  async update(req, res) {
    const role = await findOrFail(Role, req.params.role);

    // Optional: protect system roles
    if (role.is_system) {
      return res.status(403).json({
        message: 'System roles cannot be updated',
      });
    }

    await validate(req, {
      name: `sometimes|string|unique:roles,name,${role.id}`,
      description: 'nullable|string',
    });

    await role.update({
      name: req.input('name'),
      slug: slug(req.input('name')), // regenerate slug
      description: req.input('description'),
    });

    return res.json({
      message: 'Role updated successfully',
      role,
    });
  },

  async destroy(req, res) {
    const role = await findOrFail(Role, req.params.role);

    // Optional: protect system roles
    if (role.is_system) {
      return res.status(403).json({
        message: 'System roles cannot be deleted',
      });
    }

    // Prevent deleting role assigned to users
    // ($role->users() applies the User model's soft-delete scope)
    if ((await User.count({ where: { role_id: role.id } })) > 0) {
      return res.status(409).json({
        message: 'Role is assigned to users and cannot be deleted',
      });
    }

    await role.setPermissions([]); // clean pivot
    await role.destroy();

    return res.json({
      message: 'Role deleted successfully',
    });
  },
};
module.exports.withPivot = withPivot;
