// Port of app/Services/FirebaseNotificationService.php - FCM pushes for booking lifecycle events.
const { Op } = require('sequelize');
const firebase = require('./FirebaseService');
const customerFirebase = require('./CustomerFirebaseService');

class FirebaseNotificationService {
  constructor() {
    this.firebase = firebase;
    this.customerFirebase = customerFirebase;
  }

  /* Customer-facing booking events */

  async sendBookingStatusChanged(bookingId, status, customerId) {
    await this.pushToUser(customerId, 'booking_status_changed', 'Booking Update',
      `Your booking #${bookingId} is now ${status}.`, bookingId, { status });
  }

  async sendWorkerLocationUpdate(bookingId, customerId) {
    await this.pushToUser(customerId, 'worker_location_update', 'Worker On The Way',
      `Your worker is on the way for booking #${bookingId}.`, bookingId);
  }

  async sendWorkerReached(bookingId, customerId) {
    await this.pushToUser(customerId, 'worker_reached', 'Worker Arrived',
      `Your worker has arrived for booking #${bookingId}.`, bookingId);
  }

  async sendServiceStarted(bookingId, customerId) {
    await this.pushToUser(customerId, 'service_started', 'Service Started',
      `Your service for booking #${bookingId} has started.`, bookingId);
  }

  async sendBookingCompleted(bookingId, customerId) {
    await this.pushToUser(customerId, 'booking_completed', 'Service Completed',
      `Your service for booking #${bookingId} is completed.`, bookingId);
  }

  async sendRatingRequest(bookingId, customerId) {
    await this.pushToUser(customerId, 'rating_request', 'Rate Your Service',
      `Please rate your experience for booking #${bookingId}.`, bookingId);
  }

  /* Worker-facing events */

  /**
   * Notify active workers about a new booking they can CLAIM (FCM only). First-come-first-serve.
   * cityId: when provided only active workers in that city are notified.
   */
  async sendNewBookingToWorkers(bookingId, serviceCategoryId = null, cityId = null) {
    const tokens = await this.cityWorkerTokens(cityId, bookingId);
    if (!tokens.length) return;

    await this.firebase.sendToMultiple(
      tokens,
      'New Booking Available',
      `A new booking #${bookingId} is available. Tap to accept.`,
      {
        booking_id: String(bookingId),
        category_id: serviceCategoryId ? String(serviceCategoryId) : '',
        type: 'new_booking_available',
        // Tells the worker app to show an Accept button that calls the claim endpoint.
        claimable: 'true',
      }
    );

    console.log('Notification push SENT to workers', {
      booking_id: bookingId, city_id: cityId, token_count: tokens.length, type: 'new_booking_available',
    });
  }

  /** Tell the OTHER workers that a broadcast booking has been claimed. Excludes the winner's tokens. */
  async sendBookingTakenToWorkers(bookingId, cityId = null, winnerUserId = null) {
    const tokens = await this.cityWorkerTokens(cityId, bookingId, winnerUserId);
    if (!tokens.length) return;

    await this.firebase.sendToMultiple(
      tokens,
      'Booking No Longer Available',
      `Booking #${bookingId} has been taken by another worker.`,
      { booking_id: String(bookingId), type: 'booking_taken' }
    );

    console.log('Notification push SENT - booking taken', {
      booking_id: bookingId, city_id: cityId, token_count: tokens.length,
    });
  }

  /** FCM tokens of active workers, optionally city-scoped and excluding one user. */
  async cityWorkerTokens(cityId, bookingId, excludeUserId = null) {
    const { Role, User, UserFcmToken } = require('../models');
    const role = await Role.findOne({ where: { slug: 'workers' }, attributes: ['id'] });
    const workerRoleId = role ? role.id : null;

    if (!workerRoleId) {
      console.log('Notification SKIPPED - workers role not found', { booking_id: bookingId });
      return [];
    }

    const where = { role_id: workerRoleId, is_active: 1 };
    if (cityId) where.city_id = cityId;
    if (excludeUserId) where.id = { [Op.ne]: excludeUserId };
    const workerIds = (await User.findAll({ where, attributes: ['id'] })).map((u) => u.id);

    if (!workerIds.length) {
      console.log('Notification SKIPPED - no active workers to notify', { booking_id: bookingId, city_id: cityId });
      return [];
    }

    const tokens = (await UserFcmToken.findAll({ where: { user_id: { [Op.in]: workerIds } }, attributes: ['fcm_token'] }))
      .map((t) => t.fcm_token);

    if (!tokens.length) {
      console.log('Notification push NOT SENT - workers have no FCM tokens', {
        booking_id: bookingId, worker_count: workerIds.length,
      });
    }
    return tokens;
  }

  /**
   * FCM push to a single customer. The customer app is a SEPARATE Firebase project, so this MUST go via
   * CustomerFirebaseService.
   */
  async pushToUser(userId, type, title, body, bookingId = null, extra = {}) {
    const { UserFcmToken } = require('../models');
    const tokens = (await UserFcmToken.findAll({ where: { user_id: userId }, attributes: ['fcm_token'] }))
      .map((t) => t.fcm_token);

    if (!tokens.length) {
      console.log('Notification push NOT SENT - user has no FCM tokens', { user_id: userId, booking_id: bookingId, type });
      return;
    }

    const extraStr = {};
    Object.entries(extra).forEach(([k, v]) => { extraStr[k] = String(v); });
    const data = { booking_id: bookingId ? String(bookingId) : '', type, ...extraStr };

    await this.customerFirebase.sendToMultiple(tokens, title, body, data);

    console.log('Notification push SENT to user', { user_id: userId, booking_id: bookingId, type, token_count: tokens.length });
  }
}

module.exports = new FirebaseNotificationService();
module.exports.FirebaseNotificationService = FirebaseNotificationService;
