// Port of App\Http\Controllers\Survey\ResidentSurveyController
const { ResidentSurvey } = require('../../models');
const validate = require('../../utils/validate');
const paginate = require('../../utils/paginate');
const { findOrFail } = require('../../utils/binding');
const { createLikeEloquent } = require('../../utils/eloquentCreate');

const ctrl = {
  async index(req, res) {
    return res.json({
      status: true,
      count: await ResidentSurvey.count(),
      data: await paginate(ResidentSurvey, req, { order: [['created_at', 'DESC']], perPage: 20 }),
    });
  },

  async show(req, res) {
    return res.json({ status: true, data: await findOrFail(ResidentSurvey, req.params.id) });
  },

  async store(req, res) {
    const RULES = {
      surveyor_name: 'nullable|string',

      building_name: 'nullable|string',
      flat_number: 'nullable|string',
      resident_name: 'nullable|string',
      family_members: 'nullable|integer',

      maids_count: 'nullable|integer',
      work_types: 'nullable|array',
      work_duration: 'nullable|string',
      reliability_rating: 'nullable|integer|min:1|max:5',

      problems_faced: 'nullable|array',
      preferred_time_slots: 'nullable|array',

      monthly_payment_range: 'nullable|string',
      maid_source: 'nullable|array',

      app_openness: 'nullable|string',
      convincing_factors: 'nullable|array',
      extra_payment: 'nullable|string',
      whatsapp_group_interest: 'nullable|string',
    };
    await validate(req, RULES);

    const { json: survey } = await createLikeEloquent(ResidentSurvey, req, Object.keys(RULES));

    return res.status(201).json({ status: true, message: 'Survey submitted successfully', data: survey });
  },
};

module.exports = ctrl;
