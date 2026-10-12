// Ports of App\Http\Requests\EnquiryRequest and DeepCleaningEnquiryRequest (identical rules/messages).
// failedValidation() returns {success:false, message:'Validation failed.', errors} with status 422 instead of Laravel's default shape.
const validate = require('../../../utils/validate');
const { ValidationError } = require('../../../utils/errors');

const rules = {
  name: 'required|string|max:100',
  contact_no: ['required', 'string', 'max:15', 'regex:/^[0-9\\+\\-\\s]+$/'],
  email: 'required|email|max:100',
  requirements: 'required|string|max:2000',
};

const messages = {
  'name.required': 'Name is required.',
  'contact_no.required': 'Contact number is required.',
  'contact_no.regex': 'Contact number must contain only digits, +, or -.',
  'email.required': 'Email address is required.',
  'email.email': 'Please provide a valid email address.',
  'requirements.required': 'Requirements field cannot be empty.',
};

/**
 * Validate the request. Returns the validated data, or null after having sent the 422 response.
 */
async function validateEnquiryRequest(req, res) {
  try {
    return await validate(req, rules, messages);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(422).json({ success: false, message: 'Validation failed.', errors: e.errors });
      return null;
    }
    throw e;
  }
}

module.exports = { rules, messages, validateEnquiryRequest };
