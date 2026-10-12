// routes/api.php: rating link sending (public) + customer rating CRUD (auth:sanctum group)
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');
const api = h(require('./bookingRatingApi.controller'));
const ratings = h(require('./bookingRating.controller'));

const router = express.Router();

router.post('/booking/send-rating-link', api.sendRatingLink);
router.post('/cron/send-rating-links', api.sendPendingRatingLinks);

// auth:sanctum group
router.post('/booking-ratings', auth, ratings.store);
router.post('/ratings', auth, ratings.store);
router.get('/all_ratings', auth, ratings.allRatings);
router.get('/avg_ratings', auth, ratings.avgRatings);
router.get('/ratings/booking/:bookingId', auth, ratings.show);
router.get('/ratings/my', auth, ratings.myRatings);
router.get('/ratings/my-workers', auth, ratings.myWorkerRatingsForCustomer);
router.put('/ratings/:id', auth, ratings.update);
router.delete('/ratings/:id', auth, ratings.destroy);
router.get('/workers/:workerId/ratings', auth, ratings.workerRatings);

module.exports = router;
