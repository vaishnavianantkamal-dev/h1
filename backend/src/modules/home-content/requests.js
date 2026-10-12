// Port of App\Http\Requests\BannerRequest
const { validateEx, afterOrEqual } = require('../catalog/support');

const ACTION_TYPES = ['none', 'category', 'service', 'subscription', 'external_url', 'screen'];

// date_format:H:i,H:i:s  (validate.js only understands a single format)
const timeFormat = (field) => (value) => {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value));
  const ok = m && Number(m[1]) < 24 && Number(m[2]) < 60 && (m[3] === undefined || Number(m[3]) < 60);
  return ok ? true : `The ${field.replace(/_/g, ' ')} field must match the format H:i.`;
};

async function validateBanner(req) {
  // On update (PUT/PATCH) the image is optional - keep the existing one.
  const isUpdate = ['PUT', 'PATCH'].includes(req.method);

  const rules = {
    title: ['nullable', 'string', 'max:255'],
    subtitle: ['nullable', 'string', 'max:255'],
    image: [isUpdate ? 'nullable' : 'required', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:4096'],
    placement: ['nullable', 'string', 'max:50'],
    action_type: ['nullable', `in:${ACTION_TYPES.join(',')}`],
    action_value: ['nullable', 'string', 'max:1000'], // + required_unless:action_type,none,null (below)
    sort_order: ['nullable', 'integer', 'min:0'],
    is_active: ['nullable', 'boolean'],
    start_date: ['nullable', 'date'],
    end_date: ['nullable', 'date'],
    // Time-of-day window (24h): both must be set together
    start_time: ['nullable', timeFormat('start_time'), 'required_with:end_time'],
    end_time: ['nullable', timeFormat('end_time'), 'required_with:start_time'],
    // Who should see this banner - same convention as Coupon::audience.
    audience: ['nullable', 'in:all_users,new_user,member'],
  };
  const messages = {
    'start_time.required': 'The start time field is required when end time is present.',
    'end_time.required': 'The end time field is required when start time is present.',
  };

  return validateEx(req, rules, messages, async (data) => {
    const errors = {};
    afterOrEqual(data, 'end_date', 'start_date', errors);
    // required_unless:action_type,none,null
    const at = data.action_type;
    const empty = data.action_value === null || data.action_value === undefined || data.action_value === '';
    if (empty && !(at === null || at === undefined || at === 'none')) {
      errors.action_value = ['The action value field is required unless action type is in none, null.'];
    }
    return errors;
  });
}

module.exports = { validateBanner };
