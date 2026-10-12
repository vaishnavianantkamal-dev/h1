// Port of app/Helpers/RoleIdGenerator.php  (ASYNC - returns a Promise<string>)
const prefixMap = {
  contractors: 'ag',
  'co-ordinators': 'co',
  'operation-head': 'oh',
  staff: 'st',
  workers: 'w',
  customer: 'c',
  'super-admin': 'sa',
};

async function generate(roleSlug) {
  const { User } = require('../models');
  const { Op } = require('sequelize');
  const prefix = prefixMap[roleSlug] || 'u';

  // Get last user of SAME ROLE
  const lastUser = await User.findOne({
    where: { public_id: { [Op.ne]: null } },
    include: [{ association: 'role', required: true, where: { slug: roleSlug }, attributes: ['id', 'slug'] }],
    order: [['id', 'DESC']],
  });

  let lastNumber = 0;
  if (lastUser) {
    const m = /-(\d+)$/.exec(lastUser.public_id);
    if (m) lastNumber = parseInt(m[1], 10);
  }

  return `${prefix}-${String(lastNumber + 1).padStart(3, '0')}`;
}

module.exports = { generate };
