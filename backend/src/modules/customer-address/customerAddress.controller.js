// Port of App\Http\Controllers\CustomerAddress\CustomerAddressController
const sequelize = require('../../config/db');
const { CustomerAddress } = require('../../models');
const validate = require('../../utils/validate');
const { HttpError } = require('../../utils/errors');

// CustomerAddress::$fillable
const FILLABLE = [
  'customer_id',
  'house_no', 'building', 'locality', 'landmark', 'city', 'state', 'pincode',
  'label', 'label_name', 'is_default',
  'property_type', 'residents', 'bathrooms', 'balconies', 'has_pets',
  'latitude', 'longitude',
  'formatted_address',
];
const pickFillable = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => FILLABLE.includes(k)));

// PHP truthiness for request values ("0", "", 0, false, null are falsy)
const truthy = (v) => !(v === undefined || v === null || v === false || v === 0 || v === '' || v === '0');

// $customer->addresses()->findOrFail($id)
async function findAddress(req, id) {
  const where = { customer_id: req.user.id, id };
  const address = /^\d+$/.test(String(id)) ? await CustomerAddress.findOne({ where }) : null;
  if (!address) throw new HttpError(404, `No query results for model [App\\Models\\CustomerAddress] ${id}`);
  return address;
}

/** Build formatted address (Zepto style) */
function buildFormattedAddress(data) {
  return [
    data.house_no ?? null,
    data.building ?? null,
    data.locality ?? null,
    data.landmark ? `Near ${data.landmark}` : null,
    `${data.city ?? ''} - ${data.pincode ?? ''}`,
  ].filter((v) => truthy(v)).join(', ');
}

module.exports = {
  async index(req, res) {
    const addresses = await CustomerAddress.findAll({
      where: { customer_id: req.user.id },
      order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });

    return res.json(addresses);
  },

  /**
   * Check whether the customer has filled (saved) any address yet.
   * Used by the app to decide if it should prompt the customer to add an
   * address before letting them proceed (e.g. at checkout / booking).
   */
  async hasAddress(req, res) {
    const count = await CustomerAddress.count({ where: { customer_id: req.user.id } });

    return res.json({
      success: true,
      has_address: count > 0,
      address_count: count,
    });
  },

  async show(req, res) {
    return res.json(await findAddress(req, req.params.id));
  },

  /** Add new address (Zepto style) */
  async store(req, res) {
    await validate(req, {
      house_no: 'nullable|string|max:50',
      building: 'nullable|string|max:150',
      locality: 'required|string|max:150',
      landmark: 'nullable|string|max:150',
      city: 'required|string|max:100',
      state: 'required|string|max:100',
      pincode: 'required|string|max:10',
      latitude: 'nullable|numeric',
      longitude: 'nullable|numeric',
      label: 'nullable|in:Home,Friends,Work,Other',
      label_name: 'nullable|string|max:50|required_if:label,Other',
      is_default: 'boolean',

      // Home details (optional - "Skip" sends none of these)
      property_type: 'nullable|in:1RK,1BHK,2BHK,3BHK,4BHK,4+BHK',
      residents: 'nullable|integer|min:0|max:50',
      bathrooms: 'nullable|integer|min:0|max:20',
      balconies: 'nullable|integer|min:0|max:20',
      has_pets: 'nullable|boolean',
    });

    const user = req.user;

    // First address -> auto default
    if ((await CustomerAddress.count({ where: { customer_id: user.id } })) === 0) {
      req.body.is_default = true; // $request->merge(['is_default' => true])
    }

    const formatted = buildFormattedAddress(req.all());

    let address;
    const assigned = req.only(
      'house_no', 'building', 'locality', 'landmark',
      'city', 'state', 'pincode', 'latitude', 'longitude',
      'label', 'label_name', 'is_default',
      'property_type', 'residents', 'bathrooms', 'balconies', 'has_pets',
    );
    await sequelize.transaction(async (t) => {
      if (truthy(req.input('is_default'))) {
        await CustomerAddress.update({ is_default: false }, { where: { customer_id: user.id }, transaction: t });
      }

      address = await CustomerAddress.create({
        customer_id: user.id,
        ...assigned,
        formatted_address: formatted,
      }, { transaction: t });
    });

    return res.status(201).json({
      message: 'Address saved successfully',
      // Eloquent create(): only the assigned attributes (+ id, timestamps) are on the model
      data: (() => {
        const j = address.toJSON();
        const out = {};
        for (const k of ['customer_id', ...Object.keys(assigned), 'formatted_address', 'updated_at', 'created_at', 'id']) out[k] = j[k];
        return out;
      })(),
    });
  },

  /** Update address */
  async update(req, res) {
    const address = await findAddress(req, req.params.id);

    await validate(req, {
      house_no: 'nullable|string|max:50',
      building: 'nullable|string|max:150',
      locality: 'nullable|string|max:150',
      landmark: 'nullable|string|max:150',
      city: 'nullable|string|max:100',
      state: 'nullable|string|max:100',
      pincode: 'nullable|string|max:10',
      latitude: 'nullable|numeric',
      longitude: 'nullable|numeric',
      label: 'nullable|in:Home,Friends,Work,Other',
      label_name: 'nullable|string|max:50|required_if:label,Other',

      // Home details (optional)
      property_type: 'nullable|in:1RK,1BHK,2BHK,3BHK,4BHK,4+BHK',
      residents: 'nullable|integer|min:0|max:50',
      bathrooms: 'nullable|integer|min:0|max:20',
      balconies: 'nullable|integer|min:0|max:20',
      has_pets: 'nullable|boolean',
    });

    await address.update(pickFillable(req.all()));

    await address.update({
      formatted_address: buildFormattedAddress(address.get({ plain: true })),
    });

    return res.json({
      message: 'Address updated',
      data: address,
    });
  },

  /** Set default address */
  async setDefault(req, res) {
    const customerId = req.user.id;
    const { id } = req.params;

    await sequelize.transaction(async (t) => {
      await CustomerAddress.update({ is_default: false }, { where: { customer_id: customerId }, transaction: t });
      await CustomerAddress.update({ is_default: true }, { where: { customer_id: customerId, id }, transaction: t });
    });

    return res.json({ message: 'Default address updated' });
  },

  /** Delete address */
  async destroy(req, res) {
    const address = await findAddress(req, req.params.id);

    if (address.is_default) {
      return res.status(422).json({
        message: 'Default address cannot be deleted',
      });
    }

    await address.destroy();

    return res.json({ message: 'Address deleted' });
  },
};
