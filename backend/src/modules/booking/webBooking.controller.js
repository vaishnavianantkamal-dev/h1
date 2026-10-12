// Port of App\Http\Controllers\Api\Booking\WebBookingController (split across several files; nothing dropped).
const create = require('./webBooking.create');
const customer = require('./webBooking.customer');
const subscription = require('./webBooking.subscription');
const reschedule = require('./webBooking.reschedule');

module.exports = {
  createBooking: create.createBooking,
  customerBookings: customer.customerBookings,
  homeInstantCard: customer.homeInstantCard,
  bookingDetails: customer.bookingDetails,
  instantExtensionOptions: customer.instantExtensionOptions,
  extendInstant: customer.extendInstant,
  cancelBooking: customer.cancelBooking,
  rescheduleMonthly: reschedule.rescheduleMonthly,
  getRescheduleHistory: reschedule.getRescheduleHistory,
  pauseSubscription: subscription.pauseSubscription,
  resumeSubscription: subscription.resumeSubscription,
  cancelSubscription: subscription.cancelSubscription,
  getPauseHistory: subscription.getPauseHistory,
  adminPauseSubscription: subscription.adminPauseSubscription,
  adminPauseHistory: subscription.adminPauseHistory,
};
