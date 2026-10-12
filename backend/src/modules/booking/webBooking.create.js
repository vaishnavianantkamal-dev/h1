// WebBookingController::createBooking (+ resolveRainCharge, parseSlotStart)
const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const config = require('../../config');
const validate = require('../../utils/validate');
const { abort } = require('../../utils/errors');
const { dayjs } = require('../../utils/time');
const {
  Booking, BookingService, Addon, ServicePlan, Service, City, Role, User, Setting,
} = require('../../models');
const H = require('./webBooking.helpers');

// PHP binds the raw request string to DATE columns (MariaDB decides if it is acceptable); bypass Sequelize's DATEONLY conversion.
const rawDate = (v) => (v === null || v === undefined ? null : sequelize.literal(sequelize.escape(String(v))));

const existsRule = (table, col) => `exists:${table},${col}`;

// Rain surcharge for an INSTANT booking that starts within the next hour, when it is raining at the location.
async function resolveRainCharge(serviceId, bookingDate, timeSlot, lat, long, city) {
  const configured = H.round2(H.toFloat(await Setting.get('rain_charge', 0)));

  // Gate 0: feature must be switched on and we need a service to classify.
  if (configured <= 0 || !serviceId) return 0.0;

  // Gate 1: must be an INSTANT-category service (dispatched now).
  const instantCategoryId = Number(config.services.instantCategoryId) || 0;
  const service = await Service.findByPk(serviceId);
  if (!service || Number(service.category_id) !== instantCategoryId) return 0.0;

  // Gate 2: service must start within the next hour.
  const startAt = parseSlotStart(bookingDate, timeSlot);
  if (!startAt) return 0.0;
  const now = dayjs();
  if (startAt.isBefore(now.subtract(15, 'minute')) || startAt.isAfter(now.add(1, 'hour'))) return 0.0;

  // Gate 3: is it raining at the booking location right now?
  const location = lat && long ? `${lat},${long}` : city ? city.name : null;
  if (!location) return 0.0;

  const WeatherService = require('../../services/WeatherService');
  return (await WeatherService.isRaining(location)) ? configured : 0.0;
}

// Parse the START time of a booking slot. Handles "09:00-11:00" (24h range) and "1:00 PM" (12h).
function parseSlotStart(date, timeSlot) {
  const start = String(timeSlot).split('-')[0].trim();
  return H.parseDateTime(date, start);
}

async function createBooking(req, res) {
  const validated = await validate(req, {
    booking_date: ['required', 'date'],
    time_slot: ['required', 'string'],
    address: ['required', 'string'],
    city_id: ['nullable', 'integer', existsRule('cities', 'id')],
    lat: ['nullable', 'numeric'],
    long: ['nullable', 'numeric'],
    source: ['nullable', 'string'],
    workers: ['nullable', 'integer', 'min:1'],

    // services
    services: ['required', 'array', 'min:1'],
    'services.*.service_id': ['required', 'integer', existsRule('services', 'id')],
    'services.*.booking_type': ['nullable', 'string'],
    'services.*.subscription_type_id': ['nullable', 'integer'],
    'services.*.start_date': ['nullable', 'date'],
    'services.*.end_date': ['nullable', 'date'],
    'services.*.unit_type': ['nullable', 'string'],
    'services.*.unit_value': ['nullable', 'numeric'],
    'services.*.quantity': ['nullable', 'integer', 'min:1'],
    'services.*.service_plan_id': ['nullable', 'integer', existsRule('service_plans', 'id')],
    'services.*.price': ['nullable', 'numeric', 'min:0'],
    'services.*.total': ['nullable', 'numeric', 'min:0'],
    'services.*.is_addon': ['sometimes', 'boolean'],

    // addons
    addons: ['sometimes', 'array'],
    'addons.*.addon_id': ['required_with:addons', 'integer', existsRule('addons', 'id')],
    'addons.*.quantity': ['nullable', 'integer', 'min:1'],
  });

  const response = await sequelize.transaction(async (t) => {
    const customer = req.user;
    const customerId = customer ? customer.id : null;

    // Resolve membership once; drives server-side plan pricing below.
    const isMember = customer ? !!(await customer.isMember()) : false;
    const isFestival = false; // festival pricing infra is dormant (see HasResolvablePrice)

    const monthlySubscriptionTypeId = Number(config.services.monthlySubscriptionTypeId) || 4;

    // Normalise each service line (plan lines are priced on the SERVER; legacy lines keep client price/dates).
    const services = [];
    for (const raw of validated.services) {
      const service = { ...raw };
      const qty = service.quantity !== undefined && service.quantity !== null ? Math.max(1, H.toInt(service.quantity)) : 1;
      let handled = false;

      if (service.service_plan_id) {
        const plan = await ServicePlan.findOne({
          where: { id: service.service_plan_id, service_id: service.service_id },
          transaction: t,
        });

        if (plan) {
          const unitPrice = plan.resolvedPrice(isMember, isFestival);

          service.price = unitPrice;
          service.total = H.round2(qty * unitPrice);
          service.start_date = dayjs().format('YYYY-MM-DD');
          service.end_date = dayjs().add(Number(plan.duration_days) || 0, 'day').format('YYYY-MM-DD');

          // Only force booking_type to 'monthly' when subscription_type_id is the real Monthly type.
          const isMonthlyPlan = H.toInt(service.subscription_type_id || 0) === monthlySubscriptionTypeId;

          if (isMonthlyPlan && !BookingService.SUBSCRIPTION_TYPES.includes(service.booking_type ?? null)) {
            service.booking_type = 'monthly';
          }
          handled = true;
        }
      }

      if (!handled) {
        // Legacy line - unchanged: price/total/dates come from the client.
        service.price = H.toFloat(service.price ?? 0);
        service.total = service.total ?? H.round2(qty * service.price);
      }
      services.push(service);
    }

    if (!services.length) abort(422, 'At least one valid service is required.');

    // FREE DEMO VALIDATION
    const freeDemoServiceId = 26;
    const wantsFreeDemo = services.some((s) => Number(s.service_id) === freeDemoServiceId);

    if (wantsFreeDemo) {
      const alreadyUsedDemo = await Booking.count({
        where: {
          [Op.and]: [
            { [Op.or]: [{ customer_phone: customer.phone }, { address: validated.address }] },
            { status: { [Op.in]: ['pending', 'confirmed', 'completed'] } },
          ],
        },
        include: [{ association: 'services', required: true, attributes: [], where: { service_id: freeDemoServiceId } }],
        distinct: true,
        transaction: t,
      });

      if (alreadyUsedDemo > 0) abort(422, 'Demo already used for this customer or address.');
    }

    const instantExtendServiceId = 30;
    const instantCategoryId = Number(config.services.instantCategoryId) || 0;

    const wantsExtend = services.some((s) => Number(s.service_id) === instantExtendServiceId);

    if (wantsExtend) {
      const inProgressBooking = await Booking.findOne({
        where: { customer_id: customerId, status: 'inprogress' },
        attributes: ['id', 'service_id', 'status'],
        include: [{
          association: 'service', required: true, attributes: ['id', 'name'],
          where: { category_id: instantCategoryId, id: { [Op.ne]: instantExtendServiceId } },
        }],
        transaction: t,
      });

      // No in-progress booking - cannot extend
      if (!inProgressBooking) abort(422, 'You can only extend an Instant Help service that is currently active.');

      // Has in-progress booking - return array instead of JsonResponse
      return {
        extend_redirect: true,
        booking_id: inProgressBooking.id,
        service_name: (inProgressBooking.service && inProgressBooking.service.name) || 'Instant Help',
      };
    }

    // SERVICES TOTAL
    const servicesTotal = services.reduce((sum, s) => {
      const qty = s.quantity !== undefined && s.quantity !== null ? Math.max(1, H.toInt(s.quantity)) : 1;
      const lineTotal = s.total ?? qty * H.toFloat(s.price);
      return sum + Number(lineTotal);
    }, 0);

    // ADDONS TOTAL
    const addonsInput = validated.addons || [];
    let addonsTotal = 0;
    const addonsById = {};

    if (addonsInput.length) {
      const addonIds = [...new Set(addonsInput.map((r) => r.addon_id))];
      const addons = await Addon.findAll({ where: { id: { [Op.in]: addonIds } }, transaction: t });
      addons.forEach((a) => { addonsById[a.id] = a; });

      addonsTotal = addonsInput.reduce((sum, row) => {
        const addon = addonsById[row.addon_id];
        if (!addon) return sum;
        const qty = row.quantity !== undefined && row.quantity !== null ? Math.max(1, H.toInt(row.quantity)) : 1;
        return sum + qty * H.toFloat(addon.price);
      }, 0);
    }

    const itemTotal = servicesTotal + addonsTotal;

    // CHARGES (dynamic - configured in admin Settings); stored per-booking so invoices stay accurate.
    const platformFee = H.round2(H.toFloat(await Setting.get('platform_fee', 0)));
    const travellingCharge = H.round2(H.toFloat(await Setting.get('travelling_charge', 0)));

    // When a line explicitly sends subscription_type_id, trust it as the single source of truth;
    // otherwise fall back to service_plan_id / booking_type for legacy lines.
    const isSubscriptionBooking = services.some((s) => {
      if (Object.prototype.hasOwnProperty.call(s, 'subscription_type_id') && s.subscription_type_id) {
        return H.toInt(s.subscription_type_id) === monthlySubscriptionTypeId;
      }
      return !!s.service_plan_id || BookingService.SUBSCRIPTION_TYPES.includes(s.booking_type ?? null);
    });

    // Subscription fee: only on a subscription booking by a non-member (first-time subscriber).
    const subscriptionFee = isSubscriptionBooking && !isMember
      ? H.round2(H.toFloat(await Setting.get('subscription_fee', 0)))
      : 0.0;

    const gstPercent = H.toFloat(await Setting.get('gst_percent', 0));
    const taxAmount = H.round2((itemTotal * gstPercent) / 100);

    const primaryService = services[0];

    const city = validated.city_id ? await City.findByPk(validated.city_id, { transaction: t }) : null;

    // RAIN CHARGE - only for an INSTANT booking starting within the next hour while raining now.
    const rainCharge = await resolveRainCharge(
      primaryService.service_id ?? null,
      validated.booking_date,
      validated.time_slot,
      validated.lat ?? null,
      validated.long ?? null,
      city
    );

    const totalAmount = H.round2(itemTotal + platformFee + travellingCharge + subscriptionFee + taxAmount + rainCharge);

    // CREATE BOOKING
    // If this customer already has a pending/unpaid booking (last 30 min) matching this exact service, date,
    // start date, slot and address, this is the same attempt retrying payment - reuse that row.
    const primaryStartDate = primaryService.start_date ?? null;

    const existingPending = await Booking.findOne({
      where: {
        customer_id: customerId,
        status: 'pending',
        payment_status: 'unpaid',
        service_id: primaryService.service_id,
        booking_date: rawDate(validated.booking_date),
        time_slot: validated.time_slot,
        address: validated.address,
        created_at: { [Op.gte]: dayjs().subtract(30, 'minute').toDate() },
      },
      include: [{
        association: 'services', required: true, attributes: ['id'],
        where: {
          service_id: primaryService.service_id,
          is_addon: false,
          start_date: primaryStartDate ? rawDate(primaryStartDate) : null,
        },
      }],
      order: [['id', 'DESC']],
      subQuery: false,
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    const isNewBooking = !existingPending;

    const bookingAttributes = {
      customer_id: customerId,
      service_id: primaryService.service_id,
      booking_date: rawDate(validated.booking_date),
      time_slot: validated.time_slot,
      address: validated.address,
      city: city ? city.name : null,
      city_id: city ? city.id : null,
      amount: totalAmount,
      platform_fee: platformFee,
      travelling_charge: travellingCharge,
      subscription_fee: subscriptionFee,
      tax_amount: taxAmount,
      rain_charge: rainCharge,
      source: validated.source ?? null,
      latitude: validated.lat ?? null,
      longitude: validated.long ?? null,
      status: 'pending',
      workers: validated.workers ?? 1,
      payment_status: 'unpaid',
      customer_name: customer.name,
      customer_phone: customer.phone,
    };

    let booking;
    if (existingPending) {
      if (existingPending.coupon_id) {
        await require('../../services/CouponService').reverse(existingPending, t);
      }
      await existingPending.update(bookingAttributes, { transaction: t });
      await BookingService.destroy({ where: { booking_id: existingPending.id }, transaction: t });
      booking = existingPending;
    } else {
      booking = await Booking.create(bookingAttributes, { transaction: t });
    }

    // STORE SERVICES
    for (const service of services) {
      const qty = service.quantity !== undefined && service.quantity !== null ? Math.max(1, H.toInt(service.quantity)) : 1;
      const lineTotal = service.total ?? qty * H.toFloat(service.price);

      await BookingService.create({
        booking_id: booking.id,
        service_id: service.service_id,
        service_plan_id: service.service_plan_id ?? null,
        quantity: qty,
        booking_type: service.booking_type ?? 'instant',
        subscription_type_id: service.subscription_type_id ?? null,
        start_date: rawDate(service.start_date ?? null),
        end_date: rawDate(service.end_date ?? null),
        unit_type: service.unit_type ?? null,
        unit_value: service.unit_value ?? null,
        price: H.toFloat(service.price),
        total: lineTotal,
      }, { transaction: t });
    }

    // STORE ADDONS
    if (addonsInput.length && Object.keys(addonsById).length) {
      for (const row of addonsInput) {
        const addon = addonsById[row.addon_id];
        if (!addon) continue;

        const qty = row.quantity !== undefined && row.quantity !== null ? Math.max(1, H.toInt(row.quantity)) : 1;
        const price = H.toFloat(addon.price);
        const lineTotal = qty * price;

        await BookingService.create({
          booking_id: booking.id,
          service_id: primaryService.service_id,
          addon_id: addon.id,
          is_addon: true,
          quantity: qty,
          booking_type: 'addon',
          price,
          total: lineTotal,
        }, { transaction: t });
      }
    }

    return {
      booking_id: booking.id,
      amount: require('../../models/serializer').attr('Booking', 'amount', booking.amount),
      city_id: booking.city_id,
      is_new_booking: isNewBooking,
    };
  });

  // Handle extend redirect outside the transaction
  if (response.extend_redirect) {
    return res.status(422).json({
      success: false,
      can_extend: true,
      booking_id: response.booking_id,
      message: `You have an active "${response.service_name}" The service is active. To extend it, go to ‘My Services’ in your profile.`,
    });
  }

  // Only notify admins/coordinators for a genuinely new booking.
  if (response.is_new_booking) {
    try {
      const superAdminRole = await Role.findOne({ where: { slug: 'super-admin' } });
      const coordinatorRole = await Role.findOne({ where: { slug: 'co-ordinators' } });
      const superAdminRoleId = superAdminRole ? superAdminRole.id : null;
      const coordinatorRoleId = coordinatorRole ? coordinatorRole.id : null;
      const bookingCityId = response.city_id ?? null;

      const roleClauses = [{ role_id: superAdminRoleId }];
      // Coordinators only get notifications for their own city
      if (bookingCityId) roleClauses.push({ role_id: coordinatorRoleId, city_id: bookingCityId });
      else roleClauses.push({ role_id: coordinatorRoleId });

      const users = await User.findAll({
        where: { is_active: true, [Op.or]: roleClauses },
        attributes: ['id'],
      });
      const tokens = await H.fcmTokensFor(users.map((u) => u.id));

      if (tokens.length) {
        await H.sendToMultiple(tokens, 'New Booking Arrived! 🔔', `Booking #${response.booking_id} has been placed.`, {
          type: 'new_booking',
          booking_id: response.booking_id,
        });
      }
    } catch (e) {
      // Never break the booking response if notification fails
      console.error('Booking notification failed: ' + e.message);
    }
  }

  return res.json({
    success: true,
    message: 'Booking created successfully',
    booking_id: response.booking_id,
    amount: response.amount,
    status: 'pending',
  });
}

module.exports = { createBooking, resolveRainCharge, parseSlotStart };
