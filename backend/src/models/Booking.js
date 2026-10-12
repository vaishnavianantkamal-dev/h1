const { Op, literal } = require('sequelize');
const { dayjs } = require('../utils/time');
const { jsonField, boolField, flagField, addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const ID = { type: DataTypes.BIGINT.UNSIGNED };
  const money = (extra = {}) => ({ type: DataTypes.DECIMAL(10, 2), ...extra });

  const Booking = sequelize.define('Booking', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },

    // Relations
    customer_id: { ...ID, allowNull: false },
    service_id: { ...ID, allowNull: false },
    worker_id: { ...ID, allowNull: true },
    worker_ids: jsonField(DataTypes, 'worker_ids'),                       // cast array
    rejected_worker_ids: jsonField(DataTypes, 'rejected_worker_ids'),     // cast array
    coordinator_ids: jsonField(DataTypes, 'coordinator_ids'),             // cast array
    assigned_by: { ...ID, allowNull: true },
    assigned_at: { type: DataTypes.DATE, allowNull: true },
    approved_by: { ...ID, allowNull: true },
    coupon_id: { ...ID, allowNull: true },

    // Booking info
    booking_date: { type: DataTypes.DATEONLY, allowNull: false },
    time_slot: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },

    // Location
    city: { type: DataTypes.STRING, allowNull: true },
    city_id: { ...ID, allowNull: true },
    pincode: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.STRING, allowNull: true },
    longitude: { type: DataTypes.STRING, allowNull: true },

    // Pricing (decimal:2 casts)
    amount: money({ allowNull: false }),
    original_amount: money({ allowNull: true }),
    discount_amount: money({ defaultValue: 0 }),
    platform_fee: money({ defaultValue: 0 }),
    travelling_charge: money({ defaultValue: 0 }),
    subscription_fee: money({ defaultValue: 0 }),
    tax_amount: money({ defaultValue: 0 }),
    rain_charge: money({ defaultValue: 0 }),

    // Status
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' }, // enum pending|confirmed|completed|cancelled|assigned|inprogress|reassigned|paused|cancellation_requested
    workers: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 1 },
    payment_status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'unpaid' },

    // Worker accept/decline
    acceptance_status: { type: DataTypes.STRING, allowNull: true },
    acceptance_requested_at: { type: DataTypes.DATE, allowNull: true },
    accepted_at: { type: DataTypes.DATE, allowNull: true },
    declined_at: { type: DataTypes.DATE, allowNull: true },
    decline_reason: { type: DataTypes.STRING, allowNull: true },

    // Payment
    razorpay_order_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_signature: { type: DataTypes.STRING, allowNull: true },
    payment_attempt_no: { type: DataTypes.INTEGER, allowNull: true },
    payment_attempted_at: { type: DataTypes.DATE, allowNull: true },
    payment_ref: { type: DataTypes.STRING, allowNull: true },
    razorpay_link_id: { type: DataTypes.STRING, allowNull: true },
    razorpay_payment_url: { type: DataTypes.TEXT, allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: true },

    // Bot tracking
    source: { type: DataTypes.STRING, defaultValue: 'whatsapp' },
    bot_session_id: { type: DataTypes.STRING, allowNull: true },
    bot_payload: jsonField(DataTypes, 'bot_payload'), // cast array

    customer_name: { type: DataTypes.STRING, allowNull: true },
    customer_phone: { type: DataTypes.STRING, allowNull: true },
    is_final: boolField(DataTypes, 'is_final'),       // cast boolean

    approved_at: { type: DataTypes.DATE, allowNull: true },
    invoice_sent_at: { type: DataTypes.DATE, allowNull: true },
    subscription_welcome_sent_at: { type: DataTypes.DATE, allowNull: true },
    is_seen: flagField(DataTypes, 'is_seen', 0),
    customer_seen: flagField(DataTypes, 'customer_seen', 0),
    worker_seen: flagField(DataTypes, 'worker_seen', 0),
    earning_credited: flagField(DataTypes, 'earning_credited', 0),
    worker_reached_at: { type: DataTypes.DATE, allowNull: true },
    service_started_at: { type: DataTypes.DATE, allowNull: true },
    service_ended_at: { type: DataTypes.DATE, allowNull: true },
    service_end_at: { type: DataTypes.DATE, allowNull: true },
    rating_link_sent_at: { type: DataTypes.DATE, allowNull: true },
    reminder_sent_at: { type: DataTypes.DATE, allowNull: true },
    end_reminder_15_sent_at: { type: DataTypes.DATE, allowNull: true },
    extension_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    reschedule_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
    last_rescheduled_at: { type: DataTypes.DATE, allowNull: true },

    // Cancellation / refund
    cancellation_deduction_percentage: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    cancellation_deducted_amount: money({ allowNull: true }),
    refund_amount: money({ allowNull: true }),
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    razorpay_refund_id: { type: DataTypes.STRING, allowNull: true },

    cancellation_previous_status: { type: DataTypes.STRING, allowNull: true },
    cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
    cancellation_requested_at: { type: DataTypes.DATE, allowNull: true },
    cancellation_reviewed_by: { ...ID, allowNull: true },
    cancellation_reviewed_at: { type: DataTypes.DATE, allowNull: true },
    cancellation_rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'bookings',
    scopes: {
      /**
       * scopeActiveMembership: ACTIVE, PAID monthly subscription (paid, not cancelled, has at least one
       * recurring booking_service whose end_date is today or later).
       * Usage: Booking.scope('activeMembership').findOne({ where: { customer_id } })
       * (the subquery references the main table alias `Booking`, i.e. use it on Booking itself, not as an include)
       */
      activeMembership: () => {
        const types = sequelize.models.BookingService.SUBSCRIPTION_TYPES;
        const today = dayjs().format('YYYY-MM-DD');
        return {
          where: {
            [Op.and]: [
              { payment_status: Booking.PAYMENT_PAID },
              { status: { [Op.notIn]: ['cancelled'] } },
              literal(
                '`Booking`.`id` IN (SELECT `bs`.`booking_id` FROM `booking_services` AS `bs` WHERE `bs`.`booking_type` IN ('
                + types.map((t) => sequelize.escape(t)).join(', ')
                + ') AND DATE(`bs`.`end_date`) >= ' + sequelize.escape(today) + ')'
              ),
            ],
          },
        };
      },
    },
  });

  /** Payment status constants (USE THESE EVERYWHERE) */
  Booking.PAYMENT_UNPAID = 'unpaid';
  Booking.PAYMENT_PENDING = 'payment_pending';
  Booking.PAYMENT_PAID = 'paid';
  Booking.PAYMENT_FAILED = 'failed';
  Booking.PAYMENT_REFUNDED = 'refunded';

  /** Mass assignable fields: Booking.fillable / Booking.pickFillable(obj) */
  addFillable(Booking, [
    'customer_id', 'service_id', 'worker_id', 'coordinator_ids', 'assigned_by', 'approved_by', 'worker_ids',
    'rejected_worker_ids', 'coupon_id', 'discount_amount', 'original_amount',
    'booking_date', 'time_slot',
    'address', 'city', 'city_id', 'pincode', 'latitude', 'longitude',
    'amount', 'platform_fee', 'travelling_charge', 'subscription_fee', 'tax_amount', 'rain_charge', 'status',
    'workers', 'payment_status',
    'acceptance_status', 'acceptance_requested_at', 'accepted_at', 'declined_at', 'decline_reason',
    'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'payment_attempt_no', 'payment_attempted_at',
    'payment_ref', 'razorpay_link_id', 'razorpay_payment_url', 'paid_at',
    'source', 'bot_session_id', 'bot_payload',
    'customer_name', 'customer_phone', 'is_final',
    'approved_at', 'invoice_sent_at', 'subscription_welcome_sent_at', 'is_seen', 'customer_seen', 'worker_seen',
    'earning_credited', 'worker_reached_at', 'service_started_at', 'service_ended_at', 'service_end_at',
    'rating_link_sent_at', 'reminder_sent_at', 'end_reminder_15_sent_at', 'extension_count',
    'cancellation_deduction_percentage', 'cancellation_deducted_amount', 'refund_amount', 'cancelled_at',
    'razorpay_refund_id',
    'cancellation_previous_status', 'cancellation_reason', 'cancellation_requested_at', 'cancellation_reviewed_by',
    'cancellation_reviewed_at', 'cancellation_rejection_reason',
  ]);

  Booking.associate = (models) => {
    // PHP relation is city(), but `city` is also a string column (Eloquent returns the column); Sequelize forbids the clash,
    // so the relation is exposed as `cityRelation`.
    Booking.belongsTo(models.City, { foreignKey: 'city_id', as: 'cityRelation', constraints: false });
    Booking.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
    Booking.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
    Booking.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker' });
    Booking.belongsTo(models.User, { foreignKey: 'assigned_by', as: 'assignedBy' });
    Booking.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approvedBy' });
    Booking.hasOne(models.BookingRating, { foreignKey: 'booking_id', as: 'rating' });
    // Per-day time overrides for monthly subscription visits
    Booking.hasMany(models.BookingVisitOverride, { foreignKey: 'booking_id', as: 'visitOverrides' });
    Booking.hasMany(models.BookingService, { foreignKey: 'booking_id', as: 'bookingServices' });
    Booking.hasMany(models.BookingService, { foreignKey: 'booking_id', as: 'services' });
    Booking.hasMany(models.BookingExtension, { foreignKey: 'booking_id', as: 'extensions' });
    // PHP: hasMany(BookingService)->where('is_addon', true)->with('addon'); callers add include {association:'addon'} for the nested addon.
    Booking.hasMany(models.BookingService, { foreignKey: 'booking_id', as: 'addons', scope: { is_addon: true } });
    Booking.hasMany(models.BookingAlert, { foreignKey: 'booking_id', as: 'alerts' });
  };

  // ---------------------------------------------------------------------------------------------
  // Accessors / helpers
  // ---------------------------------------------------------------------------------------------

  // getInvoiceNumberAttribute (accessor, not in $appends -> plain property, not serialised)
  Object.defineProperty(Booking.prototype, 'invoice_number', {
    get() {
      return 'INV-2026/' + String(Number(this.id) + 199).padStart(3, '0');
    },
  });

  /**
   * coordinators() relation: users whose id is in the coordinator_ids JSON column.
   * Async helper -> returns User rows (PHP relation was a pivot-less belongsToMany + whereIn).
   */
  Booking.prototype.getCoordinators = function getCoordinators(options = {}) {
    const ids = this.coordinator_ids || [];
    if (!ids.length) return Promise.resolve([]);
    return sequelize.models.User.findAll({ where: { id: { [Op.in]: ids } }, ...options });
  };

  /**
   * The time slot that actually applies on a given day: the one-day override if the customer
   * rescheduled that visit, otherwise the booking's normal time_slot. Uses the loaded relation
   * (visitOverrides) when available. ASYNC (returns Promise<string>).
   */
  Booking.prototype.effectiveTimeSlotFor = async function effectiveTimeSlotFor(date) {
    const day = dayjs(date).format('YYYY-MM-DD');

    let override;
    if (this.visitOverrides) {
      override = this.visitOverrides.find((o) => dayjs(o.visit_date).format('YYYY-MM-DD') === day);
    } else {
      override = await sequelize.models.BookingVisitOverride.findOne({
        where: { booking_id: this.id, visit_date: day },
      });
    }

    return (override && override.time_slot) || this.time_slot;
  };

  // ---------------------------------------------------------------------------------------------
  // Model events: Booking::booted() updated() listener  +  BookingObserver::updated()
  // (Hooks run only for instance save()/update(); bulk Booking.update() does not fire them,
  //  same as Eloquent query-builder updates.)
  // ---------------------------------------------------------------------------------------------
  const txOpt = (options) => (options && options.transaction ? { transaction: options.transaction } : {});

  Booking.afterUpdate(async (booking, options) => {
    // ---- booted(): updated ------------------------------------------------------------------
    // When a booking becomes paid, broadcast it to active workers in the booking's city.
    // Wrapped so a push failure can never break the payment flow.
    if (booking.changed('payment_status') && booking.payment_status === Booking.PAYMENT_PAID) {
      try {
        const service = booking.service || await sequelize.models.Service.findByPk(booking.service_id, txOpt(options));
        const FirebaseNotificationService = require('../services/FirebaseNotificationService');
        await FirebaseNotificationService.sendNewBookingToWorkers(
          booking.id,
          (service && service.category_id) || null,
          booking.city_id
        );
      } catch (e) {
        console.warn('Broadcast to workers on paid failed', { booking_id: booking.id, error: e.message });
      }
    }

    if (!booking.changed('status')) {
      return;
    }

    // Dashboard counts depend on booking status -> invalidate cache.
    require('../services/CacheService').forgetDashboardCounts();

    // Observer: sync worker is_active flags when status changed.
    await syncWorkersOnStatusChange(booking, options);

    if (booking.status === 'completed') {
      // Record one delivered day on each recurring/subscription booking_service (once per calendar day).
      const { BookingService } = sequelize.models;
      const today = dayjs().format('YYYY-MM-DD');
      await BookingService.update(
        {
          completed_visits: literal('completed_visits + 1'),
          last_completed_date: today,
        },
        {
          where: {
            booking_id: booking.id,
            booking_type: { [Op.in]: BookingService.SUBSCRIPTION_TYPES },
            [Op.and]: [{ [Op.or]: [{ last_completed_date: null }, literal(`DATE(last_completed_date) != '${today}'`)] }],
          },
          ...txOpt(options),
        }
      );
    }
  });

  // BookingObserver::updated (status part)
  async function syncWorkersOnStatusChange(booking, options) {
    let workerIds = booking.worker_ids || [];

    if (!workerIds.length && booking.worker_id) {
      workerIds = [booking.worker_id];
    }

    for (const workerId of workerIds) {
      await syncWorkerActiveStatus(workerId, booking.id, booking.status, options);
    }
  }

  // BookingObserver::syncWorkerActiveStatus
  async function syncWorkerActiveStatus(workerId, bookingId, newStatus, options) {
    const { User } = sequelize.models;
    const worker = await User.findByPk(workerId, txOpt(options));
    if (!worker) return;

    if (['inprogress', 'assigned'].includes(newStatus)) {
      await worker.update({ is_active: 0 }, txOpt(options));
    } else if (['completed', 'cancelled', 'pending'].includes(newStatus)) {
      // worker_ids LIKE "%id%" matches the stored JSON text
      const stillBusy = (await Booking.count({
        where: {
          id: { [Op.ne]: bookingId },
          status: { [Op.in]: ['inprogress', 'assigned'] },
          [Op.or]: [
            { worker_id: workerId },
            sequelize.where(sequelize.col('worker_ids'), { [Op.like]: `%${workerId}%` }),
          ],
        },
        ...txOpt(options),
      })) > 0;

      await worker.update({ is_active: stillBusy ? 0 : 1 }, txOpt(options));
    }
  }

  return Booking;
};
