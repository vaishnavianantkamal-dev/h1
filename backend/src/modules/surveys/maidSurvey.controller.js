// Port of App\Http\Controllers\Survey\MaidSurveyController
const { MaidSurvey } = require('../../models');
const validate = require('../../utils/validate');
const paginate = require('../../utils/paginate');
const { findOrFail } = require('../../utils/binding');
const { createLikeEloquent } = require('../../utils/eloquentCreate');

const ctrl = {
  async store(req, res) {
    const RULES = {
      supervisor_name: 'nullable|string',

      maid_name: 'required|string',
      age: 'nullable|integer',
      mobile_number: 'nullable|string',
      address: 'nullable|string',

      houses_count: 'nullable|integer',
      buildings_count: 'nullable|integer',
      family_members: 'nullable|integer',

      only_earning_member: 'nullable|string',
      has_children: 'nullable|string',
      children_school: 'nullable|string',

      work_types: 'nullable|array',

      daily_work_hours: 'nullable|integer',
      area_experience: 'nullable|string',

      charge_per_house: 'nullable|string',
      monthly_income: 'nullable|integer',

      paid_on_time: 'nullable|string',
      holidays: 'nullable|string',
      paid_leave: 'nullable|string',

      has_smartphone: 'nullable|string',
      uses_whatsapp: 'nullable|string',
      uses_online_payment: 'nullable|string',

      salary_online: 'nullable|string',
      interested_extra_work_app: 'nullable|string',

      work_priority: 'nullable|array',

      feels_safe: 'nullable|string',
      interested_in_benefits: 'nullable|string',
    };
    await validate(req, RULES);

    const { json: survey } = await createLikeEloquent(MaidSurvey, req, Object.keys(RULES));

    return res.status(201).json({ status: true, message: 'Survey submitted successfully', data: survey });
  },

  // GET ALL
  async index(req, res) {
    return res.json({
      status: true,
      count: await MaidSurvey.count(),
      data: await paginate(MaidSurvey, req, { order: [['created_at', 'DESC']], perPage: 20 }),
    });
  },

  async show(req, res) {
    return res.json({ status: true, data: await findOrFail(MaidSurvey, req.params.id) });
  },
};

module.exports = ctrl;
