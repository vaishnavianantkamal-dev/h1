// Port of routes/api.php `Route::prefix('cms')->group(...)` (no auth middleware in Laravel either).
// File-accepting routes use cmsUpload (multer any(), raw field names - see cmsHelpers).
const express = require('express');
const h = require('../../utils/asyncHandler');
const { cmsUpload } = require('./cmsHelpers');

const hero = h(require('./cmsHero.controller'));
const service = h(require('./cmsService.controller'));
const serviceItem = h(require('./cmsServiceItem.controller'));
const contact = h(require('./cmsContact.controller'));
const app = h(require('./cmsApp.controller'));
const header = h(require('./cmsHeader.controller'));
const footer = h(require('./cmsFooter.controller'));
const earnBanner = h(require('./cmsEarnBanner.controller'));
const savingsBanner = h(require('./cmsSavingsBanner.controller'));
const benefit = h(require('./cmsSubscriptionBenefit.controller'));
const whyChoose = h(require('./cmsWhyChoose.controller'));
const policy = h(require('./cmsSubscriptionPolicy.controller'));
const bookingInstruction = h(require('./cmsBookingInstruction.controller'));
const chooseUs = h(require('./cmsChooseUs.controller'));
const mission = h(require('./cmsMission.controller'));
const howWork = h(require('./cmsHowWork.controller'));
const working = h(require('./cmsWorking.controller'));
const testimonial = h(require('./cmsTestimonial.controller'));
const faq = h(require('./cmsFaq.controller'));

const router = express.Router();
const u = cmsUpload;

// Route::apiResource($name, $ctrl) with Laravel's route parameter name
function apiResource(name, param, ctrl) {
  router.get(`/cms/${name}`, ctrl.index);
  router.post(`/cms/${name}`, u, ctrl.store);
  router.get(`/cms/${name}/:${param}`, ctrl.show);
  router.put(`/cms/${name}/:${param}`, u, ctrl.update);
  router.patch(`/cms/${name}/:${param}`, u, ctrl.update);
  router.delete(`/cms/${name}/:${param}`, ctrl.destroy);
}

// Hero Section (Single Entry)
router.get('/cms/hero', hero.index);
router.post('/cms/hero', u, hero.store);
router.put('/cms/hero', u, hero.update);
router.patch('/cms/hero', u, hero.update);

// Service Section (Single Entry)
router.get('/cms/service', service.index);
router.post('/cms/service', u, service.store);
router.put('/cms/service', u, service.update);
router.patch('/cms/service', u, service.update);

// Service Cards
apiResource('service-items', 'service_item', serviceItem);

// Contact Section
router.get('/cms/contact', contact.index);
router.post('/cms/contact', u, contact.store);
router.put('/cms/contact', u, contact.update);
router.patch('/cms/contact', u, contact.update);
router.post('/cms/contact-save', u, contact.storeOrUpdate);

// App Section
router.get('/cms/get-in-app', app.index);
router.post('/cms/get-in-app', u, app.store);
router.put('/cms/get-in-app', u, app.update);
router.patch('/cms/get-in-app', u, app.update);
router.post('/cms/get-in-app-save', u, app.storeOrUpdate);

router.get('/cms/header', header.index);
router.post('/cms/header', u, header.store);
router.put('/cms/header', u, header.update);
router.patch('/cms/header', u, header.update);
router.post('/cms/header/toggle-marquee', header.toggleMarquee);

// Footer Section
router.get('/cms/footer', footer.index);
router.post('/cms/footer', u, footer.store);
router.put('/cms/footer', u, footer.update);
router.patch('/cms/footer', u, footer.update);

// Earn Banner - single entry
router.get('/cms/earn-banner', earnBanner.index);
router.post('/cms/earn-banner-save', u, earnBanner.storeOrUpdate);

// Savings Banner - single entry
router.get('/cms/savings-banner', savingsBanner.index);
router.post('/cms/savings-banner-save', u, savingsBanner.storeOrUpdate);

// Subscription Benefits
router.get('/cms/subscription-benefits', benefit.index);
router.post('/cms/subscription-benefits-bulk', u, benefit.bulkSave);
router.delete('/cms/subscription-benefits/:id', benefit.destroy);

// Why Choose Hobit
router.get('/cms/why-choose', whyChoose.index);
router.post('/cms/why-choose-bulk', u, whyChoose.bulkSave);
router.delete('/cms/why-choose/:id', whyChoose.destroy);

// Subscription Rules & Policies
router.get('/cms/subscription-policies', policy.index);
router.post('/cms/subscription-policies-bulk', u, policy.bulkSave);
router.delete('/cms/subscription-policies/:id', policy.destroy);

// Booking Instructions
router.patch('/cms/booking-instructions/:bookingInstruction/toggle', bookingInstruction.toggle);
apiResource('booking-instructions', 'bookingInstruction', bookingInstruction);

// Choose Us (Multiple Cards)
apiResource('choose-us', 'choose_us', chooseUs);
router.post('/cms/choose-us-bulk', u, chooseUs.bulkUpdate);

// Mission (Multiple Badges)
apiResource('missions', 'mission', mission);
router.post('/cms/missions-bulk', u, mission.bulkUpdate);

// How It Works (Multiple Cards)
apiResource('how-works', 'how_work', howWork);
router.post('/cms/how-works-bulk', u, howWork.bulkUpdate);

// Working (Multiple Cards)
apiResource('workings', 'working', working);

// Testimonials (Multiple Cards)
apiResource('testimonials', 'testimonial', testimonial);

// FAQs (Multiple Cards)
apiResource('faqs', 'faq', faq);
router.post('/cms/faqs-bulk', u, faq.bulkUpdate);

module.exports = router;
