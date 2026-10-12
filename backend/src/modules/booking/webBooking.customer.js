// WebBookingController: customerBookings, homeInstantCard (+ resolveInstantBanner, buildTrackCard, trackStatusLabel),
// bookingDetails, instantExtensionOptions, extendInstant, cancelBooking
const { Op, literal, fn, col, where: sqlWhere } = require('sequelize');
const sequelize = require('../../config/db');
const config = require('../../config');
const validate = require('../../utils/validate');
const { storageUrl } = require('../../utils/storage');
const { dayjs } = require('../../utils/time');
const {
  Booking, BookingVisitOverride, BookingExtension, InstantHelpCard, WorkerLiveTrack, Service,
} = require('../../models');
const H = require('./webBooking.helpers');

async function customerBookings(req, res) {
  const customer = req.user; // from token
  const today = dayjs().format('YYYY-MM-DD');

  const where = { customer_id: customer.id };

  // Apply filter ONLY if status is provided
  if (req.filled('status')) {
    const status = req.input('status');

    if (status === 'in_progress') where.status = { [Op.in]: ['pending', 'processing'] };

    if (status === 'completed') where.status = 'completed';

    if (status === 'rescheduled') {
      const overridesTable = BookingVisitOverride.getTableName();
      where[Op.or] = [
        literal(
          `EXISTS (SELECT 1 FROM \`${overridesTable}\` WHERE \`${overridesTable}\`.\`booking_id\` = \`Booking\`.\`id\` AND DATE(\`${overridesTable}\`.\`visit_date\`) = ${sequelize.escape(today)})`
        ),
        {
          [Op.and]: [
            { reschedule_count: { [Op.gt]: 0 } },
            sqlWhere(fn('DATE', col('Booking.booking_date')), { [Op.gte]: today }),
          ],
        },
      ];
    }
  }

  const bookings = await Booking.findAll({
    where,
    include: [
      {
        association: 'services',
        required: false,
        include: [
          { association: 'service', required: false, include: [{ association: 'category', required: false }] },
          { association: 'subscriptionType', required: false },
        ],
      },
      { association: 'addons', required: false, include: [{ association: 'addon', required: false }] }, // addon booking lines + addon details
    ],
    order: [['id', 'DESC']],
  });

  const overridesRows = bookings.length
    ? await BookingVisitOverride.findAll({
      where: {
        booking_id: { [Op.in]: bookings.map((b) => b.id) },
        [Op.and]: [sqlWhere(fn('DATE', col('visit_date')), { [Op.gte]: today })],
      },
      order: [['visit_date', 'ASC']],
    })
    : [];
  const upcomingOverrides = new Map();
  for (const o of overridesRows) {
    const key = Number(o.booking_id);
    if (!upcomingOverrides.has(key)) upcomingOverrides.set(key, []);
    upcomingOverrides.get(key).push(o);
  }

  const data = bookings.map((booking) => {
    const overrides = upcomingOverrides.get(Number(booking.id)) || [];
    const todayOv = overrides.find((o) => H.dateStr(o.visit_date) === today);
    const nextOv = overrides[0]; // nearest upcoming (list is >= today, sorted)

    const plain = H.toPlain(booking);
    plain.effective_time_slot = (todayOv && todayOv.time_slot) ?? booking.time_slot;
    plain.is_rescheduled_today = !!todayOv;
    plain.next_visit_override = nextOv
      ? { visit_date: H.dateStr(nextOv.visit_date), time_slot: nextOv.time_slot }
      : null;
    plain.is_rescheduled = !!nextOv
      || (H.toInt(booking.reschedule_count) > 0
        && !!booking.booking_date
        && H.dateStr(booking.booking_date) >= today);
    return plain;
  });

  return res.json({ success: true, data });
}

/**
 * GET /api/customer/home-instant-card
 * Active booking (assigned / inprogress) -> lean track card; otherwise dynamic banner or {"type":"none"}.
 */
async function homeInstantCard(req, res) {
  const customer = req.user;

  const active = await Booking.findOne({
    where: { customer_id: customer.id, status: { [Op.in]: ['assigned', 'inprogress', 'in_progress'] } },
    include: [
      { association: 'service', required: false },
      { association: 'worker', required: false },
      { association: 'services', required: false, include: [{ association: 'service', required: false }] },
    ],
    order: [['booking_date', 'DESC'], ['id', 'DESC']],
  });

  if (active) {
    return res.json({
      success: true,
      data: { type: 'active_booking', booking: await buildTrackCard(active) },
    });
  }

  const card = await resolveInstantBanner();

  if (!card) {
    return res.json({ success: true, data: { type: 'none' } });
  }

  return res.json({
    success: true,
    data: { type: 'banner', banner: instantHelpCardResource(card) },
  });
}

// InstantHelpCardResource::toArray
function instantHelpCardResource(card) {
  return {
    id: card.id,
    title: card.title,
    subtitle: card.subtitle,
    // Full absolute URL - app can load it directly.
    image_url: card.image ? storageUrl(card.image) : null,
    // The generic tap-instruction the app acts on.
    action_type: card.action_type,
    action_value: card.action_value,
    is_active: card.is_active,
    start_date: card.start_date,
    end_date: card.end_date,
    trigger_type: card.trigger_type,
    start_hour: card.start_hour,
    end_hour: card.end_hour,
    priority: card.priority,
  };
}

// Pick the banner for the current moment (contextual slots only inside their hour window; lower priority first).
async function resolveInstantBanner() {
  const candidates = await InstantHelpCard.scope('visible').findAll({
    order: [['priority', 'ASC'], ['id', 'DESC']],
  });
  return candidates.find((card) => card.matchesCurrentHour()) || null;
}

// Lean summary payload for the home "track your order" card.
async function buildTrackCard(booking) {
  const lines = booking.services || [];
  const service = booking.service || (lines[0] && lines[0].service) || null;

  let image = null;
  let images = service ? service.images : null;
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch (_) { images = null; }
  }
  if (service && Array.isArray(images) && images.length) {
    image = storageUrl(images[0]);
  }

  const track = await WorkerLiveTrack.findOne({ where: { booking_id: booking.id } });

  const isLive = track
    && track.last_ping_at
    && dayjs(track.last_ping_at).isAfter(dayjs().subtract(3, 'minute'));

  return {
    id: booking.id,
    status: booking.status,
    status_label: trackStatusLabel(booking),
    service_name: (service && service.name) || 'Service',
    image,
    worker_name: booking.worker ? booking.worker.name : null,
    time_slot: booking.time_slot,
    service_end_at: booking.service_end_at,
    is_live: !!isLive,
    track_url: `${config.appUrl}/api/track/${booking.id}/latest`,
  };
}

// Human status line, derived from status + timestamp fields.
function trackStatusLabel(booking) {
  if (!booking.worker_reached_at && !booking.service_started_at) {
    return 'Worker assigned · on the way';
  }

  if (booking.worker_reached_at && !booking.service_started_at) {
    return 'Worker arrived';
  }

  if (booking.service_end_at) {
    const minutesLeft = Math.floor(dayjs(booking.service_end_at).diff(dayjs(), 'minute', true));
    if (minutesLeft > 0) return `Service in progress · ${minutesLeft} min left`;
  }

  return 'Service in progress';
}

async function bookingDetails(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  const lines = await booking.getServices({
    include: [
      { association: 'service', required: false },
      { association: 'subscriptionType', required: false },
      { association: 'addon', required: false },
    ],
  });

  const services = lines.map((line) => {
    const data = H.toPlain(line);
    if (line.is_addon && line.addon) {
      data.addon_name = data.addon ? data.addon.name : line.addon.name;
      data.addon_price = data.addon ? data.addon.price : line.addon.price;
      data.addon_qty = line.quantity;
    }
    return data;
  });

  const bj = booking.toJSON();
  return res.json({
    success: true,
    data: {
      id: booking.id,
      booking_date: bj.booking_date,
      time_slot: booking.time_slot,
      status: booking.status,
      payment_status: booking.payment_status,
      amount: bj.amount,
      address: booking.address,
      city: booking.city,
      services,
    },
  });
}

// Shared by instantExtensionOptions / extendInstant: instant + inprogress + service_end_at checks.
async function extensionGuard(booking, res) {
  const service = booking.service_id ? await Service.findByPk(booking.service_id) : null;

  const isInstant = service
    && Number(service.category_id) === Number(config.services.instantCategoryId);

  if (!isInstant) {
    return H.failJson(res, 422, 'Extension allowed only for instant services');
  }

  if (booking.status !== 'inprogress') {
    return H.failJson(res, 422, 'Booking is not in progress');
  }

  if (!booking.service_end_at) {
    return H.failJson(res, 422, 'Service end time not set');
  }
  return null;
}

async function instantExtensionOptions(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  if (await extensionGuard(booking, res)) return undefined;

  const extensionServices = await Service.findAll({
    where: {
      category_id: config.services.instantCategoryId,
      name: { [Op.like]: '%Extend%' },
      status: 1,
    },
    attributes: ['id', 'name', 'duration_minutes', 'price'],
  });

  if (!extensionServices.length) {
    return H.failJson(res, 500, 'Extension service not configured');
  }

  return res.json({ success: true, data: extensionServices });
}

async function extendInstant(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  const data = await validate(req, {
    extension_service_id: 'required|exists:services,id',
  });

  if (await extensionGuard(booking, res)) return undefined;

  const extensionService = await Service.findOne({
    where: {
      id: data.extension_service_id,
      category_id: config.services.instantCategoryId,
      name: { [Op.like]: '%Extend%' },
      status: 1,
    },
  });

  if (!extensionService) {
    return H.failJson(res, 422, 'Selected extension service is not valid');
  }

  const paymentService = require('../../services/ExtensionPaymentService');
  let extension;
  let payment;
  try {
    await sequelize.transaction(async (t) => {
      extension = await BookingExtension.create({
        booking_id: booking.id,
        duration_minutes: extensionService.duration_minutes,
        amount: extensionService.price,
        payment_status: BookingExtension.PAYMENT_PENDING,
      }, { transaction: t });

      payment = await paymentService.createLink(
        extension.id,
        Number(extension.amount),
        booking.customer_phone
      );

      await extension.update({
        razorpay_link_id: payment.id,
        razorpay_payment_url: payment.short_url,
        payment_attempted_at: new Date(),
      }, { transaction: t });
    });
  } catch (e) {
    return H.failJson(res, 500, 'Failed to create extension');
  }

  return res.json({
    success: true,
    extension_id: extension.id,
    amount: extension.amount,
    payment_link: payment.short_url,
    payment_link_id: payment.id,
  });
}

// Cancel a web booking for the logged-in customer (admin-review flow).
async function cancelBooking(req, res) {
  const booking = await H.bindBooking(req);
  const customer = req.user;

  if (!H.sameId(booking.customer_id, customer.id)) return H.unauthorized(res);

  if (booking.status === 'cancelled') {
    return H.failJson(res, 422, 'Booking is already cancelled');
  }

  if (booking.status === 'cancellation_requested') {
    return H.failJson(res, 422, 'A cancellation request for this booking is already pending review');
  }

  if (!['pending', 'processing'].includes(booking.status)) {
    return H.failJson(res, 422, 'Only pending or processing bookings can be cancelled');
  }

  const windowStart = booking.paid_at ?? booking.created_at;
  if (Math.floor(Date.now() / 1000) - Math.floor(new Date(windowStart).getTime() / 1000) > 30) {
    return H.failJson(res, 422, 'Cancellation window has expired');
  }

  await validate(req, {
    reason: 'nullable|string|max:500',
  });

  await booking.update({
    cancellation_previous_status: booking.status,
    status: 'cancellation_requested',
    cancellation_reason: req.input('reason'),
    cancellation_requested_at: new Date(),
  });

  await booking.reload();

  return res.json({
    success: true,
    message: 'Cancellation request submitted for review',
    data: {
      id: booking.id,
      status: booking.status,
      cancellation_requested_at: booking.cancellation_requested_at,
    },
  });
}

module.exports = {
  customerBookings, homeInstantCard, bookingDetails, instantExtensionOptions, extendInstant, cancelBooking,
  resolveInstantBanner, buildTrackCard, trackStatusLabel,
};
