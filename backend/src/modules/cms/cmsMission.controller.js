// Port of app/Http/Controllers/CMS/CmsMissionController.php
const { Mission, Op } = require('../../models');
const { IMG, ImageUploadHelper, wrap, ok, fail, invalid, assigned, entries, nz, whereNotInIds } = require('./cmsHelpers');

const notFound = (res) => fail(res, 'Mission not found', 404);

module.exports = {
  // GET /cms/missions
  async index(req, res) {
    const missions = await Mission.findAll({ where: { is_active: true }, order: [['order', 'ASC']] });
    return ok(res, { success: true, data: missions });
  },

  // POST /cms/missions - single new badge, image optional
  async store(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'required|string|max:255',
      heading: 'required|string|max:255',
      description: 'required|string',
      badge_title: 'nullable|string|max:255',
      badge_subtitle: 'nullable|string|max:255',
      order: 'nullable|integer',
      is_active: 'nullable|boolean',
      image: ['nullable', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    if (r.hasFile('image')) data.image = await ImageUploadHelper.upload(r.file('image'), 'missions');

    const mission = await Mission.create(data);
    return ok(res, { success: true, message: 'Mission created successfully', data: assigned(mission, data) }, 201);
  },

  // GET /cms/missions/:mission
  async show(req, res) {
    const mission = await Mission.findByPk(req.params.mission);
    if (!mission) return notFound(res);
    return ok(res, { success: true, data: mission });
  },

  // PUT/PATCH /cms/missions/:mission - image optional (existing kept if not sent)
  async update(req, res) {
    const mission = await Mission.findByPk(req.params.mission);
    if (!mission) return notFound(res);

    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      badge_title: 'sometimes|nullable|string|max:255',
      badge_subtitle: 'sometimes|nullable|string|max:255',
      order: 'sometimes|integer',
      is_active: 'sometimes|boolean',
      image: ['sometimes', 'nullable', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);
    const data = v.data;

    if (r.hasFile('image')) {
      if (mission.image) await ImageUploadHelper.delete(mission.image);
      data.image = await ImageUploadHelper.upload(r.file('image'), 'missions');
    } else {
      delete data.image; // preserve existing image
    }

    await mission.update(data);
    await mission.reload();
    return ok(res, { success: true, message: 'Mission updated successfully', data: mission });
  },

  // DELETE /cms/missions/:mission
  async destroy(req, res) {
    const mission = await Mission.findByPk(req.params.mission);
    if (!mission) return notFound(res);

    if (mission.image) await ImageUploadHelper.delete(mission.image);
    await mission.destroy();

    return ok(res, { success: true, message: 'Mission deleted successfully' });
  },

  // POST /cms/missions-bulk
  //  - missions[N][id] present -> UPDATE that badge (image optional)
  //  - missions[N][id] absent  -> CREATE new badge  (image optional)
  //  - DB badges whose id is NOT in this payload -> DELETED
  async bulkUpdate(req, res) {
    const r = wrap(req);
    const v = await r.validate({
      short_heading: 'sometimes|string|max:255',
      heading: 'sometimes|string|max:255',
      description: 'sometimes|string',
      is_active: 'sometimes|boolean',

      missions: 'required|array|min:1',
      'missions.*.id': 'sometimes|nullable|integer|exists:missions,id',
      'missions.*.badge_title': 'nullable|string|max:255',
      'missions.*.badge_subtitle': 'nullable|string|max:255',
      'missions.*.image': ['sometimes', 'nullable', ...IMG],
    });
    if (v.errors) return invalid(res, v.errors);

    // Shared section fields (array_filter keeps non-null values)
    const sectionFields = {};
    const sf = {
      short_heading: nz(r.input('short_heading'), null),
      heading: nz(r.input('heading'), null),
      description: nz(r.input('description'), null),
      is_active: r.has('is_active') ? r.boolean('is_active') : null,
    };
    for (const [k, val] of Object.entries(sf)) if (val !== null) sectionFields[k] = val;

    const missions = entries(r.input('missions'));

    // Collect incoming IDs (existing badges being kept)
    const incomingIds = missions
      .map(([, item]) => (item && typeof item === 'object' ? item.id : undefined))
      .filter((id) => id)
      .map((id) => parseInt(id, 10));

    // Delete badges removed on the frontend
    const toDelete = await Mission.findAll({ where: whereNotInIds(Op, incomingIds) });
    for (const badge of toDelete) {
      if (badge.image) await ImageUploadHelper.delete(badge.image);
      await badge.destroy();
    }

    const results = [];

    for (const [index, item] of missions) {
      const badgeId = item && item.id ? parseInt(item.id, 10) : null;
      const hasImage = r.hasFile(`missions.${index}.image`);

      if (badgeId) {
        // UPDATE existing badge
        const mission = await Mission.findByPk(badgeId);
        if (!mission) return fail(res, `Mission badge with id ${badgeId} not found`, 404);

        const updateData = {
          ...sectionFields,
          badge_title: nz(item.badge_title, mission.badge_title),
          badge_subtitle: nz(item.badge_subtitle, mission.badge_subtitle),
          order: index,
        };

        if (hasImage) {
          if (mission.image) await ImageUploadHelper.delete(mission.image);
          updateData.image = await ImageUploadHelper.upload(r.file(`missions.${index}.image`), 'missions');
        }
        // no image key -> existing image preserved

        await mission.update(updateData);
        await mission.reload();
        results.push(mission);
      } else {
        // CREATE new badge
        let image = null;
        if (hasImage) image = await ImageUploadHelper.upload(r.file(`missions.${index}.image`), 'missions');

        results.push(await Mission.create({
          ...sectionFields,
          short_heading: nz(r.input('short_heading'), ''),
          heading: nz(r.input('heading'), ''),
          description: nz(r.input('description'), ''),
          badge_title: nz(item && item.badge_title, null),
          badge_subtitle: nz(item && item.badge_subtitle, null),
          image,
          order: index,
          is_active: r.boolean('is_active', true),
        }));
      }
    }

    return ok(res, { success: true, message: 'Mission badges saved successfully', data: results });
  },
};
