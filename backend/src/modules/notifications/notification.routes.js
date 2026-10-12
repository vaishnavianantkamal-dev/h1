// Routes from routes/api.php: admin booking notifications, mobile app device token + booking notifications.
const express = require('express');
const h = require('../../utils/asyncHandler');
const { auth } = require('../../middleware/auth');
const notification = h(require('./notification.controller'));
const appNotification = h(require('./appNotification.controller'));

const router = express.Router();

// auth:sanctum group
router.get('/notifications', auth, notification.index);
router.put('/notifications/read/:bookingId', auth, notification.markAsRead);

// Route::middleware('auth:sanctum')->post('/device/token', ...)  (registered twice in Laravel; once is enough)
router.post('/device/token', auth, appNotification.updateToken);

// Mobile app: customer / worker booking notifications (auth:sanctum)
router.get('/customer/notifications', auth, appNotification.customerNotifications);
router.put('/customer/notifications/read/:booking', auth, appNotification.markCustomerNotificationRead);
router.get('/worker/notifications', auth, appNotification.workerNotifications);
router.put('/worker/notifications/read/:booking', auth, appNotification.markWorkerNotificationRead);

// Api\NotificationController routes are commented out in routes/api.php (left unmounted):
// const apiNotification = h(require('./apiNotification.controller'));
//   GET    /notifications/             -> apiNotification.index         (auth)
//   GET    /notifications/unread-count -> apiNotification.getUnreadCount
//   POST   /notifications/:id/read     -> apiNotification.markAsRead
//   POST   /notifications/read-all     -> apiNotification.markAllAsRead
//   DELETE /notifications/:id          -> apiNotification.delete

module.exports = router;
