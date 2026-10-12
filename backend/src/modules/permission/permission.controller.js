// Port of App\Http\Controllers\Permission\PermissionController
const { Permission } = require('../../models');

module.exports = {
  async index(req, res) {
    return res.json(await Permission.findAll());
  },
};
