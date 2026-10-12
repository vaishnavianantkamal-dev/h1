// Port of App\Http\Requests\SendBookingWhatsAppRequest
const validate = require('../../../utils/validate');

const rules = {
  // coordinator_id is actually user id with role_id = 6
  coordinator_id: 'required|integer|exists:users,id',
  booking_id: 'required|integer|exists:bookings,id',
};

const messages = {
  'coordinator_id.required': 'Please select a coordinator.',
  'coordinator_id.exists': 'Selected coordinator not found.',
  'booking_id.required': 'Booking ID is required.',
  'booking_id.exists': 'Booking not found.',
};

// Throws ValidationError (-> 422 {message, errors}); returns validated data.
const validateSendBookingWhatsApp = (req) => validate(req, rules, messages);

module.exports = { rules, messages, validateSendBookingWhatsApp };
