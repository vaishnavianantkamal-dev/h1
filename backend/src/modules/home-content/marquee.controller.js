// Port of App\Http\Controllers\Admin\MarqueeController
const { Marquee } = require('../../models');
const CacheService = require('../../services/CacheService');
const { findOrFail } = require('../../utils/binding');
const { validateEx, pick, castBool, createdAttrs, updatedAttrs } = require('../catalog/support');

const FILLABLE = ['text', 'status', 'sort_order'];

module.exports = {
  /** GET /api/admin/marquees - list all marquee sentences (any status). */
  async index(req, res) {
    const items = await Marquee.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    res.json({ success: true, data: items });
  },

  /** POST /api/admin/marquees */
  async store(req, res) {
    const data = await validateEx(req, {
      text: 'required|string|max:500',
      status: 'nullable|boolean',
      sort_order: 'nullable|integer|min:0',
    });

    const attrs = pick(data, FILLABLE);
    const item = await Marquee.create(attrs);
    CacheService.forgetMarquee();

    res.status(201).json({ success: true, message: 'Marquee sentence created', data: createdAttrs(item, attrs, { status: castBool }) });
  },

  /** GET /api/admin/marquees/{marquee} */
  async show(req, res) {
    const marquee = await findOrFail(Marquee, req.params.marquee);
    res.json({ success: true, data: marquee });
  },

  /** PUT/PATCH /api/admin/marquees/{marquee} */
  async update(req, res) {
    const marquee = await findOrFail(Marquee, req.params.marquee);
    const data = await validateEx(req, {
      text: 'sometimes|required|string|max:500',
      status: 'nullable|boolean',
      sort_order: 'nullable|integer|min:0',
    });

    const attrs = pick(data, FILLABLE);
    await marquee.update(attrs);
    CacheService.forgetMarquee();

    res.json({ success: true, message: 'Marquee sentence updated', data: updatedAttrs(marquee, attrs, { status: castBool }) });
  },

  /** DELETE /api/admin/marquees/{marquee} */
  async destroy(req, res) {
    const marquee = await findOrFail(Marquee, req.params.marquee);
    await marquee.destroy();
    CacheService.forgetMarquee();

    res.json({ success: true, message: 'Marquee sentence deleted' });
  },
};
