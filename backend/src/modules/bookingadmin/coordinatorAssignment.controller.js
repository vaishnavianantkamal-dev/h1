// Port of App\Http\Controllers\Admin\CoordinatorAssignmentController
const { Op } = require('sequelize');
const { Booking, BookingService, User, Role, UserFcmToken, Service, BookingRating } = require('../../models');
const paginate = require('../../utils/paginate');
const validate = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const { jsonContains, instanceOf, cleanIntIds } = require('./_helpers');

const firebase = () => instanceOf(require('../../services/FirebaseService'));
const whatsApp = () => instanceOf(require('../../services/WhatsAppService'));
const DTFMT = 'YYYY-MM-DD HH:mm:ss';

async function coordinatorRoleId() {
  const r = await Role.findOne({ where: { slug: 'co-ordinators' }, attributes: ['id'] });
  return r ? r.id : null;
}

// Shared by assign() and reassign(): returns an error payload (422) or null.
async function checkCoordinators(booking, coordinatorIds) {
  const roleId = await coordinatorRoleId();
  const validRows = await User.findAll({
    where: { id: coordinatorIds, role_id: roleId, is_active: 1 },
    attributes: ['id'],
  });
  const validCoordinators = validRows.map((r) => Number(r.id));
  const invalidIds = coordinatorIds.filter((id) => !validCoordinators.includes(id));

  if (invalidIds.length) {
    return {
      success: false,
      message: 'Some coordinator IDs are invalid or inactive.',
      invalid_ids: invalidIds,
    };
  }
  return { validCoordinators };
}

async function checkCity(booking, validCoordinators) {
  if (booking.city_id) {
    const wrong = await User.findAll({
      where: { id: validCoordinators, city_id: { [Op.ne]: booking.city_id } },
      attributes: ['id'],
    });
    if (wrong.length) {
      return {
        success: false,
        message: 'All coordinators must belong to the same city as the booking.',
        wrong_city_ids: wrong.map((r) => Number(r.id)),
      };
    }
  }
  return null;
}

async function notifyFcm(coordinatorIds, title, body, type, booking) {
  const rows = await UserFcmToken.findAll({ where: { user_id: coordinatorIds }, attributes: ['fcm_token'] });
  firebase().requireMessaging(); // PHP: new FirebaseService(app(Messaging::class)) throws without credentials
  await firebase().sendToMultiple(
    rows.map((r) => r.fcm_token),
    title,
    body,
    { booking_id: String(booking.id), type },
  );
}

// PHP urlencode(): everything except [A-Za-z0-9_.-] is percent-encoded, space -> '+'
const phpUrlencode = (v) => encodeURIComponent(v).replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`).replace(/%20/g, '+');

const numFmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function sendWhatsAppToCoordinators(booking, coordinators) {
  const customer = booking.customer_id ? await User.findByPk(booking.customer_id) : null;
  const service = booking.service_id ? await Service.findByPk(booking.service_id) : null;
  const worker = booking.worker_id ? await User.findByPk(booking.worker_id) : null;

  const address = booking.address ?? 'N/A';
  const mapsLink = address !== 'N/A'
    ? `https://www.google.com/maps/search/?api=1&query=${phpUrlencode(address)}`
    : 'N/A';

  const datetime = booking.booking_date && booking.time_slot
    ? `${dayjs(booking.booking_date).format('DD-MM-YYYY')} ${booking.time_slot}`
    : 'N/A';

  const wa = whatsApp();

  for (const coordinator of coordinators) {
    if (!coordinator.phone || coordinator.phone === '0') continue;

    try {
      await wa.sendBookingTemplate(
        coordinator.phone,
        coordinator.name,
        {
          name: (customer && customer.name) ?? 'N/A',
          phone: (customer && customer.phone) ?? 'N/A',
        },
        {
          service: (service && service.name) ?? 'N/A',
          worker: (worker && worker.name) ?? 'N/A',
          datetime,
          amount: `₹${numFmt(booking.amount)}`,
          status: `${String(booking.payment_status || 'UNPAID').toUpperCase()} - ${
            ((s) => s.charAt(0).toUpperCase() + s.slice(1))(booking.status || 'Pending')}`,
          address,
          location: mapsLink,
        },
      );
    } catch (e) {
      console.error('WhatsApp failed for coordinator', {
        coordinator_id: coordinator.id,
        booking_id: booking.id,
        error: e.message,
      });
    }
  }
}

function formatBooking(booking, detailed = false) {
  const customer = booking.customer;
  const worker = booking.worker;
  const service = booking.service;
  const bs = booking.bookingServices || [];
  const toDT = (d) => (d ? dayjs(d).format(DTFMT) : null);
  const j = booking.toJSON(); // Eloquent-shaped attribute values (decimal casts -> strings, booking_date raw)

  return {
    id: booking.id,
    status: booking.status,
    payment_status: booking.payment_status,
    invoice_number: booking.invoice_number, // computed attribute

    booking_date: j.booking_date,
    time_slot: booking.time_slot,
    created_at: toDT(booking.created_at),

    address: booking.address,
    city: booking.city,
    pincode: booking.pincode,
    latitude: booking.latitude,
    longitude: booking.longitude,

    amount: j.amount,
    original_amount: j.original_amount,
    discount_amount: j.discount_amount,
    paid_at: toDT(booking.paid_at),

    customer: customer
      ? { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }
      : { name: booking.customer_name, phone: booking.customer_phone },

    worker: worker ? { id: worker.id, name: worker.name, phone: worker.phone } : null,

    service: service ? { id: service.id, name: service.name } : null,

    booking_services: bs.map((b) => ({
      id: b.id,
      name: (b.addon && b.addon.name) ?? b.name ?? null,
      quantity: b.quantity ?? 1,
      price: b.toJSON().price ?? null,
      is_addon: !!b.is_addon,
    })),

    rating: booking.rating ? { stars: booking.rating.rating } : null,

    coordinator_ids: detailed ? (booking.coordinator_ids || []) : null,
    notes: detailed ? (booking.notes ?? null) : null,
  };
}

const CoordinatorAssignmentController = {
  // POST /admin/assign-coordinator
  async assign(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      coordinator_ids: 'array|min:1', // always array
      'coordinator_ids.*': 'exists:users,id',
    });

    const coordinatorIds = cleanIntIds(req.input('coordinator_ids'));
    // (PHP: array_map('intval') keeps 0s; filter only matters for invalid ids which already fail exists)

    const check = await checkCoordinators(null, coordinatorIds);
    if (!check.validCoordinators) return res.status(422).json(check);

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.payment_status !== 'paid') {
      return res.status(422).json({
        success: false,
        message: 'Booking cannot be assigned. Payment is not completed.',
      });
    }

    const cityErr = await checkCity(booking, check.validCoordinators);
    if (cityErr) return res.status(422).json(cityErr);

    await booking.update({ coordinator_ids: coordinatorIds, assigned_by: req.user.id });

    console.log('Booking assigned to coordinators', {
      booking_id: booking.id,
      coordinator_ids: coordinatorIds,
      assigned_by: req.user.id,
    });

    const coordinators = await User.findAll({ where: { id: coordinatorIds }, attributes: ['id', 'name', 'phone'] });

    await notifyFcm(
      coordinatorIds,
      'New Booking Assigned',
      `You have been assigned as coordinator for booking #${booking.id}.`,
      'coordinator_assigned',
      booking,
    );

    await sendWhatsAppToCoordinators(booking, coordinators);

    const fresh = await Booking.findByPk(booking.id);
    return res.json({
      success: true,
      message: coordinatorIds.length > 1
        ? `${coordinatorIds.length} coordinators assigned successfully.`
        : 'Coordinator assigned successfully.',
      booking_id: booking.id,
      coordinator_ids: fresh.coordinator_ids,
      coordinators,
    });
  },

  // POST /admin/reassign-coordinator
  async reassign(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      coordinator_ids: 'required|array|min:1',
      'coordinator_ids.*': 'exists:users,id',
    });

    const coordinatorIds = cleanIntIds(req.input('coordinator_ids'));

    const booking = await findOrFail(Booking, req.input('booking_id'));

    const check = await checkCoordinators(booking, coordinatorIds);
    if (!check.validCoordinators) return res.status(422).json(check);

    const cityErr = await checkCity(booking, check.validCoordinators);
    if (cityErr) return res.status(422).json(cityErr);

    await booking.update({ coordinator_ids: coordinatorIds, assigned_by: req.user.id });

    console.log('Booking reassigned to coordinators', {
      booking_id: booking.id,
      coordinator_ids: coordinatorIds,
      assigned_by: req.user.id,
    });

    const coordinators = await User.findAll({ where: { id: coordinatorIds }, attributes: ['id', 'name', 'phone'] });

    await notifyFcm(
      coordinatorIds,
      'Booking Reassigned',
      `You have been reassigned as coordinator for booking #${booking.id}.`,
      'coordinator_reassigned',
      booking,
    );

    await sendWhatsAppToCoordinators(booking, coordinators);

    const fresh = await Booking.findByPk(booking.id);
    return res.json({
      success: true,
      message: coordinatorIds.length > 1
        ? `${coordinatorIds.length} coordinators reassigned successfully.`
        : 'Coordinator reassigned successfully.',
      booking_id: booking.id,
      coordinator_ids: fresh.coordinator_ids,
      coordinators,
    });
  },

  // POST /admin/unassign-coordinator
  async unassign(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      coordinator_ids: 'nullable|array', // specific ones to remove
      'coordinator_ids.*': 'exists:users,id',
    });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (req.filled('coordinator_ids')) {
      const removeIds = req.input('coordinator_ids').map((v) => parseInt(v, 10) || 0);
      const currentIds = booking.coordinator_ids || [];
      const updatedIds = currentIds.filter((id) => !removeIds.includes(id));

      await booking.update({ coordinator_ids: updatedIds.length ? updatedIds : null });

      return res.json({
        success: true,
        message: removeIds.length > 1
          ? `${removeIds.length} coordinators removed from booking.`
          : 'Coordinator removed from booking.',
        coordinator_ids: updatedIds.length ? updatedIds : [],
        remaining_count: updatedIds.length,
      });
    }

    await booking.update({ coordinator_ids: null });

    return res.json({
      success: true,
      message: 'All coordinators unassigned from booking.',
      coordinator_ids: [],
    });
  },

  // GET /admin/booking/{booking}/coordinators
  async assignedCoordinators(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);
    const coordinatorIds = booking.coordinator_ids || [];

    if (!coordinatorIds.length) {
      return res.json({
        success: true,
        booking_id: booking.id,
        total: 0,
        coordinator_ids: [],
        coordinators: [],
      });
    }

    const coordinators = await User.findAll({
      where: { id: coordinatorIds },
      attributes: ['id', 'name', 'phone', 'is_active'],
    });

    return res.json({
      success: true,
      booking_id: booking.id,
      total: coordinators.length,
      coordinator_ids: coordinatorIds,
      coordinators,
    });
  },

  // GET /coordinator/my-bookings
  async myBookings(req, res) {
    await validate(req, {
      status: 'nullable|string',
      per_page: 'nullable|integer|min:1|max:100',
    });

    const where = [jsonContains('Booking.coordinator_ids', req.user.id)];
    if (req.filled('status')) where.push({ status: req.input('status') });

    const bookings = await paginate(Booking, req, {
      where: { [Op.and]: where },
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'], required: false },
        { model: Service, as: 'service', attributes: ['id', 'name'], required: false },
        { model: User, as: 'worker', attributes: ['id', 'name', 'phone'], required: false },
        {
          model: BookingService, as: 'bookingServices', required: false,
          include: [{ association: 'addon', required: false }],
        },
        { model: BookingRating, as: 'rating', attributes: ['id', 'booking_id', 'rating'], required: false },
      ],
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      perPage: req.input('per_page') ?? 15,
    });

    return res.json({
      success: true,
      data: bookings.data.map((b) => formatBooking(b)),
      meta: {
        current_page: bookings.current_page,
        last_page: bookings.last_page,
        per_page: bookings.per_page,
        total: bookings.total,
      },
    });
  },

  // GET /coordinator/my-bookings/{booking}
  async show(req, res) {
    const booking = await findOrFail(Booking, req.params.booking, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'phone', 'email'], required: false },
        { model: Service, as: 'service', attributes: ['id', 'name'], required: false },
      ],
    });

    const assignedIds = booking.coordinator_ids || [];

    if (!assignedIds.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
    }

    // detailed formatting also reads worker / bookingServices / rating lazily (as Eloquent would)
    booking.worker = booking.worker_id ? await booking.getWorker() : null;
    booking.bookingServices = await booking.getBookingServices({ include: [{ association: 'addon', required: false }] });
    booking.rating = await booking.getRating();

    return res.json({ success: true, data: formatBooking(booking, true) });
  },

  // GET /coordinator/my-bookings/summary
  async summary(req, res) {
    const coordinatorId = req.user.id;
    const base = jsonContains('Booking.coordinator_ids', coordinatorId);
    const count = (status) => Booking.count({
      where: status ? { [Op.and]: [base, { status }] } : base,
    });

    const counts = {
      total: await count(),
      pending: await count('pending'),
      confirmed: await count('confirmed'),
      completed: await count('completed'),
      cancelled: await count('cancelled'),
      assigned: await count('assigned'),
    };

    return res.json({ success: true, data: counts });
  },
};

module.exports = CoordinatorAssignmentController;
