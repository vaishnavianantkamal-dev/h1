// Public `app/*` routes backed by the CMS controllers (routes/api.php, near the end).
// NOT included here: `app/banners` (BannerController, owned by another module).
const express = require('express');
const h = require('../../utils/asyncHandler');

const earnBanner = h(require('./cmsEarnBanner.controller'));
const savingsBanner = h(require('./cmsSavingsBanner.controller'));
const benefit = h(require('./cmsSubscriptionBenefit.controller'));
const whyChoose = h(require('./cmsWhyChoose.controller'));
const policy = h(require('./cmsSubscriptionPolicy.controller'));
const bookingInstruction = h(require('./cmsBookingInstruction.controller'));

const router = express.Router();

// Public - the "EARN" promo chip shown in the app home top bar
router.get('/app/earn-banner', earnBanner.app);

// Public - the "Upto 50% cheaper than booking single visits" savings banner
router.get('/app/savings-banner', savingsBanner.app);

// Public - the "Subscription Benefits" list shown on the subscription screen
router.get('/app/subscription-benefits', benefit.app);

// Public - the "Why Choose Hobit?" section
router.get('/app/why-choose', whyChoose.app);

// Public - the "Subscription Rules & Policies" screen
router.get('/app/subscription-policies', policy.app);

// Public - "Booking Instructions" list for a given subscription
router.get('/app/booking-instructions', bookingInstruction.app);

module.exports = router;
