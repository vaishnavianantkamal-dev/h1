// Port of App\Http\Controllers\Api\PincodeController
// + App\Http\Requests\PincodeRequest (rules/messages below) + App\Http\Resources\PincodeResource (identity)
const { Op, QueryTypes, fn, col, where: sqlWhere } = require('sequelize');
const sequelize = require('../../config/db');
const { Pincode, City } = require('../../models');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { createdJson } = require('../../utils/eloquent');
const CacheService = require('../../services/CacheService');

// ---- PincodeRequest -------------------------------------------------------
const pincodeRequestMessages = {
  'pincode.regex': 'Pincode must be exactly 6 digits.',
  'pincode.unique': 'This pincode already exists.',
};

// FormRequest::validated() - includes keys that are present but null
async function validatedPincodeRequest(req) {
  // On update, ignore the current record's own pincode for unique check
  const pincodeId = req.params.pincode;

  const rules = {
    area: ['required', 'string', 'max:255'],
    pincode: [
      'required',
      'string',
      'max:10',
      'regex:/^[0-9]{6}$/', // 6-digit Indian pincode
      // Rule::unique('pincodes','pincode')->ignore($pincodeId)->whereNull('deleted_at')
      async (value) => {
        const [row] = await sequelize.query(
          `SELECT 1 AS x FROM pincodes WHERE pincode = ? AND deleted_at IS NULL${pincodeId ? ' AND id <> ?' : ''} LIMIT 1`,
          { replacements: pincodeId ? [value, pincodeId] : [value], type: QueryTypes.SELECT },
        );
        return row ? pincodeRequestMessages['pincode.unique'] : undefined;
      },
    ],
    city: ['nullable', 'string', 'max:100'],
    // Optional: clients may send city_id directly. When omitted, the
    // Pincode model resolves it from the city name.
    city_id: ['nullable', 'integer', 'exists:cities,id'],
    state: ['nullable', 'string', 'max:100'],
    country: ['nullable', 'string', 'max:100'],
    is_active: ['nullable', 'boolean'],
  };

  const data = await validate(req, rules, { 'pincode.regex': pincodeRequestMessages['pincode.regex'] });
  const all = req.all();
  for (const k of Object.keys(rules)) if (all[k] === null && !(k in data)) data[k] = null;
  return data;
}

// filter_var($v, FILTER_VALIDATE_BOOLEAN)
const filterBool = (v) => ['1', 'true', 'on', 'yes'].includes(String(v).trim().toLowerCase());

module.exports = {
  /**
   * GET /api/pincodes
   * List all pincodes (with optional search & pagination)
   */
  async index(req, res) {
    const and = [];

    // Search by area, pincode, or city
    if (req.filled('search')) {
      const term = `%${req.input('search')}%`;
      and.push({
        [Op.or]: [
          { area: { [Op.like]: term } },
          { pincode: { [Op.like]: term } },
          { city: { [Op.like]: term } },
        ],
      });
    }

    // Filter by active status
    if (req.has('is_active')) {
      and.push({ is_active: filterBool(req.input('is_active')) });
    }

    // paginate($request->get('per_page', 15)): 0/empty -> model default (15); non-numeric or negative -> SQL/type error (500)
    const perRaw = req.input('per_page', 15);
    if (perRaw !== null && perRaw !== 0 && perRaw !== '0' && (isNaN(Number(perRaw)) || Number(perRaw) < 0)) throw new Error('Invalid per_page');
    const perPage = Math.max(parseInt(perRaw, 10) || 15, 1);
    const page = Math.max(parseInt(req.query.page ?? 1, 10) || 1, 1);
    const where = and.length ? { [Op.and]: and } : undefined;

    const total = await Pincode.count({ where });
    const rows = await Pincode.findAll({
      where,
      order: [['area', 'ASC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    return res.json({
      success: true,
      data: rows.map((r) => r.toJSON()),
      meta: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: Math.max(Math.ceil(total / perPage), 1),
      },
    });
  },

  /** POST /api/pincodes - Create a new pincode */
  async store(req, res) {
    const data = await validatedPincodeRequest(req);
    const pincode = await Pincode.create(data);

    return res.status(201).json({
      success: true,
      message: 'Pincode created successfully.',
      data: (() => {
        // Eloquent create(): assigned attributes only; the saving hook adds city / city_id (reading `->city` on a row
        // without a city attribute resolves the (null) relation)
        const out = createdJson('Pincode', pincode, data);
        const j = pincode.toJSON();
        if (!('city' in out) || (out.city !== j.city && j.city !== undefined && j.city !== null)) out.city = j.city === undefined ? null : j.city; // hook may overwrite the name from city_id
        if (!('city_id' in out) && j.city_id !== null && j.city_id !== undefined) out.city_id = j.city_id;
        return out;
      })(),
    });
  },

  /** GET /api/pincodes/{id} - Show a single pincode */
  async show(req, res) {
    const pincode = await findOrFail(Pincode, req.params.pincode);

    return res.json({
      success: true,
      data: pincode.toJSON(),
    });
  },

  /** PUT/PATCH /api/pincodes/{id} - Update an existing pincode */
  async update(req, res) {
    const pincode = await findOrFail(Pincode, req.params.pincode);
    const data = await validatedPincodeRequest(req);
    await pincode.update(data);

    return res.json({
      success: true,
      message: 'Pincode updated successfully.',
      data: (await Pincode.findByPk(pincode.id)).toJSON(),
    });
  },

  /** DELETE /api/pincodes/{id} - Soft delete a pincode */
  async destroy(req, res) {
    const pincode = await findOrFail(Pincode, req.params.pincode);
    await pincode.destroy();

    return res.json({
      success: true,
      message: 'Pincode deleted successfully.',
    });
  },

  /** PATCH /api/pincodes/{id}/toggle - Toggle active/inactive status */
  async toggle(req, res) {
    const pincode = await findOrFail(Pincode, req.params.pincode);
    await pincode.update({ is_active: !pincode.is_active });

    return res.json({
      success: true,
      message: 'Status updated.',
      data: (await Pincode.findByPk(pincode.id)).toJSON(),
    });
  },

  async check(req, res) {
    await validate(req, {
      pincode: ['required', 'string', 'regex:/^[0-9]{6}$/'],
      city_id: ['nullable', 'integer', 'exists:cities,id'],
    }, {
      'pincode.required': 'Pincode is required.',
      'pincode.regex': 'Pincode must be exactly 6 digits.',
    });

    const cityId = req.filled('city_id') ? parseInt(req.input('city_id'), 10) : null;
    const cacheKey = CacheService.pincodeCheck(req.input('pincode'), cityId);

    const body = await CacheService.remember(cacheKey, CacheService.TTL_1H, async () => {
      const pincode = await Pincode.findOne({
        where: { pincode: req.input('pincode') },
        paranoid: false, // withTrashed()
      });

      if (!pincode) {
        return {
          success: false,
          available: false,
          message: 'We are not serviceable at this location.',
          reason: 'Pincode not found in master.',
        };
      }

      if (pincode.deleted_at) {
        return {
          success: false,
          available: false,
          message: 'We are not serviceable at this location.',
          reason: 'Pincode has been removed from master.',
        };
      }

      if (!pincode.is_active) {
        return {
          success: false,
          available: false,
          message: 'We are not serviceable at this location.',
          reason: 'Pincode is currently inactive.',
        };
      }

      // When city_id is provided, validate the pincode belongs to that city
      if (req.filled('city_id')) {
        const city = await City.findByPk(req.input('city_id'));
        if (city && pincode.city && String(pincode.city).trim().toLowerCase() !== String(city.name).trim().toLowerCase()) {
          return {
            success: false,
            available: false,
            message: 'We are not serviceable at this location.',
            reason: 'Pincode does not belong to the selected city.',
          };
        }
      }

      // Resolve city_id: prefer the FK, fall back to name match for old rows
      let resolvedCityId = pincode.city_id;
      if (!resolvedCityId && pincode.city) {
        const match = await City.findOne({
          where: sqlWhere(fn('LOWER', fn('TRIM', col('name'))), String(pincode.city).trim().toLowerCase()),
          attributes: ['id'],
        });
        resolvedCityId = match ? match.id : null;
      }

      return {
        success: true,
        available: true,
        message: 'We are serviceable at this location.',
        data: {
          city: pincode.city,
          city_id: resolvedCityId, // frontend forwards this into /web_booking
        },
      };
    });

    return res.status(200).json(body);
  },
};
