// Port of App\Http\Controllers\Api\BookingOtpController
const { Op, fn, col, where: sqlWhere, literal } = require('sequelize');
const { Booking, BookingOtp, BookingService, Service, User, UserFcmToken, TrackingSession } = require('../../models');
const config = require('../../config');
const queue = require('../../jobs/queue');
const { dayjs } = require('../../utils/time');
const { validate } = require('../../utils/validate');
const { findOrFail } = require('../../utils/binding');
const OtpService = require('../../services/OtpService');
const FirebaseService = require('../../services/FirebaseService');
const CustomerFirebaseService = require('../../services/CustomerFirebaseService');
const firebaseRtdb = require('../tracking/firebaseRtdb');

const now = () => new Date();
const addMinutes = (m) => dayjs().add(m, 'minute').toDate();
const url = (p) => `${config.appUrl}${p}`;
const instantCategoryId = () => config.services.instantCategoryId;
const pad = (n) => String(n).padStart(2, '0');
const gmdateHis = (s) => { s = Math.floor(s); return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`; };
const iso8601 = (d) => dayjs(d).format('YYYY-MM-DDTHH:mm:ssZ');

// Sequelize equivalents of BookingOtp scopes: forBooking / ofType / active
const forType = (bookingId, type) => ({ booking_id: bookingId, type });
const activeWhere = () => ({ verified_at: null, expires_at: { [Op.gt]: now() } });

// Record one delivered day for a subscription booking. last_completed_date guards against counting the same day twice.
async function recordSubscriptionVisit(booking) {
  const today = dayjs().format('YYYY-MM-DD');
  await BookingService.update(
    { completed_visits: literal('completed_visits + 1'), last_completed_date: today },
    {
      where: {
        booking_id: booking.id,
        booking_type: { [Op.in]: BookingService.SUBSCRIPTION_TYPES },
        [Op.or]: [
          { last_completed_date: null },
          sqlWhere(fn('DATE', col('last_completed_date')), Op.ne, today),
        ],
      },
    }
  );
}

const fcmTokensFor = async (userId) =>
  (await UserFcmToken.findAll({ where: { user_id: userId } })).map((r) => r.fcm_token);

async function sendFcm(userId, title, body, data = {}) {
  const tokens = await fcmTokensFor(userId);
  if (tokens.length) await FirebaseService.sendToMultiple(tokens, title, body, data);
}

// Customer app is a separate Firebase project -> CustomerFirebaseService
async function sendCustomerFcm(userId, title, body, data = {}) {
  if (!userId) return;
  const tokens = await fcmTokensFor(userId);
  if (tokens.length) await CustomerFirebaseService.sendToMultiple(tokens, title, body, data);
}

async function getWorkerPhone(userId) {
  if (!userId) return null;
  const user = await User.findByPk(userId);
  if (!user || !user.phone) return null;
  let phone = String(user.phone).replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone;
  return phone;
}

const expireUnverified = (bookingId, type) =>
  BookingOtp.update({ expires_at: now() }, { where: { ...forType(bookingId, type), verified_at: null } });

const ctrl = {
  async sendStartOtp(req, res) {
    await validate(req, {
      booking_id: 'required|integer',
      type: 'nullable|in:whatsapp,sms',
    });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.status !== 'assigned') return res.status(400).json({ message: 'Booking not active' });

    // Expire old unverified START OTPs
    await expireUnverified(booking.id, 'start');

    const code = OtpService.generateOtp();
    const expires = addMinutes(15);

    // CUSTOMER OTP
    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'customer',
      receiver_phone: booking.customer_phone,
      otp: code,
      type: 'start',
      expires_at: expires,
    });

    // Auto start-OTP SMS disabled on request (OTP record is still created; in-app start code keeps working).

    return res.json({ message: 'Start OTP sent successfully' });
  },

  async sendCloseOtp(req, res) {
    await validate(req, {
      booking_id: 'required|integer',
      type: 'nullable|in:whatsapp,sms',
    });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    // Expire old unverified CLOSE OTPs
    await expireUnverified(booking.id, 'close');

    const code = OtpService.generateOtp();
    const expires = addMinutes(15);
    const link = url(`/verify-otp/${booking.id}/close`);

    // WORKER ONLY
    const workerPhone = await getWorkerPhone(booking.worker_id);
    if (!workerPhone) return res.status(400).json({ message: 'Worker phone missing' });

    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'worker',
      receiver_phone: workerPhone,
      otp: code,
      type: 'close',
      expires_at: expires,
    });

    // SMS/WhatsApp sending disabled (commented out in PHP)

    return res.json({
      message: 'Close OTP sent successfully',
      booking_id: booking.id,
      worker_id: booking.worker_id,
      worker_phone: workerPhone,
      customer_phone: booking.customer_phone,
      otp: code,
      type: 'close',
      expires_at: expires,
      link,
      created_at: now(),
      updated_at: now(),
    });
  },

  async sendBothOtp(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      type: 'nullable|in:whatsapp,sms',
    });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.status !== 'assigned') {
      return res.status(400).json({ success: false, message: 'Booking not assigned' });
    }

    const service = await Service.findOne({ where: { id: booking.service_id, status: 1 } });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found or inactive' });
    }

    const workerPhone = await getWorkerPhone(booking.worker_id);
    if (!workerPhone) {
      return res.status(400).json({ success: false, message: 'Worker phone missing' });
    }

    const instantId = instantCategoryId();

    // Expire old START OTPs
    await expireUnverified(booking.id, 'start');

    const startExpires = addMinutes(15);

    // CUSTOMER -> START OTP
    const customerStartCode = OtpService.generateOtp();
    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'customer',
      receiver_phone: booking.customer_phone,
      otp: customerStartCode,
      type: 'start',
      expires_at: startExpires,
    });

    // WORKER -> START OTP
    const workerStartCode = OtpService.generateOtp();
    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'worker',
      receiver_phone: workerPhone,
      otp: workerStartCode,
      type: 'start',
      expires_at: startExpires,
    });

    // If NOT instant category -> also create CLOSE OTPs  (loose != like PHP)
    // eslint-disable-next-line eqeqeq
    if (service.category_id != instantId) {
      await expireUnverified(booking.id, 'close');

      const closeExpires = addMinutes(15);

      // WORKER -> CLOSE OTP
      const workerCloseCode = OtpService.generateOtp();
      await BookingOtp.create({
        booking_id: booking.id,
        receiver_type: 'worker',
        receiver_phone: workerPhone,
        otp: workerCloseCode,
        type: 'close',
        expires_at: closeExpires,
      });

      // CUSTOMER -> CLOSE OTP
      const customerCloseCode = OtpService.generateOtp();
      await BookingOtp.create({
        booking_id: booking.id,
        receiver_type: 'customer',
        receiver_phone: booking.customer_phone,
        otp: customerCloseCode,
        type: 'close',
        expires_at: closeExpires,
      });
    }

    return res.json({
      success: true,
      // eslint-disable-next-line eqeqeq
      message: service.category_id == instantId ? 'Only START OTP sent (Instant Service)' : 'Start & Close OTP sent',
    });
  },

  async sendStartOtp_Cron(req, res) {
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    if (req.get('X-CRON-SECRET') !== config.cronSecret) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.status !== 'confirmed') return res.status(400).json({ message: 'Booking not active' });

    const activeOtp = await BookingOtp.findOne({
      where: { ...forType(booking.id, 'start'), ...activeWhere() },
    });
    if (activeOtp) return res.status(409).json({ message: 'OTP already active' });

    await expireUnverified(booking.id, 'start');

    const code = OtpService.generateOtp();
    const expires = addMinutes(15);
    const link = url(`/verify-otp/${booking.id}/start`);

    // CUSTOMER
    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'customer',
      receiver_phone: booking.customer_phone,
      otp: code,
      type: 'start',
      expires_at: expires,
    });

    await OtpService.sendWhatsapp(booking.customer_phone, `🔐 START SERVICE OTP: ${code}\nVerify:\n${link}`);

    // WORKER
    const workerPhone = await getWorkerPhone(booking.worker_id);
    if (!workerPhone) return res.status(400).json({ message: 'Worker phone missing' });

    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'worker',
      receiver_phone: workerPhone,
      otp: code,
      type: 'start',
      expires_at: expires,
    });

    await OtpService.sendWhatsapp(workerPhone, `🔐 START SERVICE OTP: ${code}\nVerify:\n${link}`);

    return res.json({ message: 'Start OTP sent' });
  },

  // POST /booking/verifyotp/{booking}/{type}
  async verifyOtps(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);
    FirebaseService.requireMessaging();
    await validate(req, { otp: 'required|string' });

    const type = String(req.params.type).trim().toLowerCase();
    const otp = String(req.input('otp')).trim();

    const verifierOtp = await BookingOtp.findOne({
      where: { booking_id: booking.id, type, otp, ...activeWhere() },
    });

    if (!verifierOtp) {
      return res.status(200).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await BookingOtp.update(
      { verified_at: now() },
      { where: { booking_id: booking.id, type, otp, verified_at: null } }
    );

    const worker = booking.worker_id ? await User.findByPk(booking.worker_id) : null;
    let message;

    if (type === 'start') {
      if (worker) await worker.update({ is_active: 0, is_assigned: 1 });

      const service = booking.service_id ? await Service.findByPk(booking.service_id) : null;
      const serviceDuration = service && service.duration_minutes ? parseInt(service.duration_minutes, 10) : 60;
      const serviceEndAt = dayjs().add(serviceDuration, 'minute').toDate();

      await booking.update({
        worker_reached_at: now(),
        service_started_at: now(),
        service_end_at: serviceEndAt,
        status: 'inprogress',
        extension_count: 0,
        reminder_sent_at: null,
      });

      if (worker) {
        const tokens = await fcmTokensFor(worker.id);
        await FirebaseService.sendToMultiple(
          tokens,
          'Service In Progress',
          `Booking #${booking.id} has started. Please complete the service.`,
          { booking_id: String(booking.id), type: 'service_inprogress' }
        );
      }

      // eslint-disable-next-line eqeqeq
      if (service && service.category_id == instantCategoryId()) {
        await queue.dispatch('InstantServiceReminderJob', { booking_id: booking.id, bookingId: booking.id }, { delaySeconds: serviceDuration * 60 });
      }

      message = '✅ OTP verified. Service has started.';
    }

    if (type === 'close') {
      if (worker) await worker.update({ is_active: 1, is_assigned: 0 });

      await booking.update({ service_ended_at: now(), status: 'completed' });
      await recordSubscriptionVisit(booking);

      if (worker) {
        const tokens = await fcmTokensFor(worker.id);
        await FirebaseService.sendToMultiple(
          tokens,
          'Service Completed ✅',
          `Booking #${booking.id} has been completed. Great work!`,
          { booking_id: String(booking.id), type: 'service_completed' }
        );
      }

      message = '✅ OTP verified. Service has completed.';
    }

    const rows = await BookingOtp.findAll({ where: { booking_id: booking.id, type, otp }, attributes: ['receiver_phone'] });
    const phones = [...new Set(rows.map((r) => r.receiver_phone))];
    for (const phone of phones) {
      await OtpService.sendWhatsapp(phone, message);
    }

    return res.json({ success: true, message });
  },

  // POST /booking/generate-codes  (START code only, 4 digits; shown to customer, typed by worker)
  async generateCodes(req, res) {
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.status !== 'assigned') {
      return res.status(400).json({ success: false, message: 'Booking is not in assigned status' });
    }

    const service = await Service.findOne({ where: { id: booking.service_id, status: 1 } });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found or inactive' });
    }

    const startExpires = addMinutes(15);

    // Expire old START codes
    await expireUnverified(booking.id, 'start');

    const startCode = OtpService.generateOtp(4); // 4-digit booking start code

    await BookingOtp.create({
      booking_id: booking.id,
      receiver_type: 'customer',
      receiver_phone: booking.customer_phone,
      otp: startCode,
      type: 'start',
      shown_to: 'customer',
      typed_by: 'worker',
      expires_at: startExpires,
    });

    return res.json({
      success: true,
      booking_id: booking.id,
      customer_start_code: startCode, // show on CUSTOMER app
      start_expires_at: startExpires,
      message: 'Start code generated successfully',
    });
  },

  // POST /booking/end-service (no code needed)
  async endService(req, res) {
    FirebaseService.requireMessaging();
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    if (booking.status !== 'inprogress') {
      return res.status(400).json({ success: false, message: 'Booking is not in progress' });
    }

    const worker = booking.worker_id ? await User.findByPk(booking.worker_id) : null;

    if (worker) await worker.update({ is_active: 1, is_assigned: 0 });

    await booking.update({ service_ended_at: now(), status: 'completed' });
    await recordSubscriptionVisit(booking);

    // FCM -> worker app
    if (worker) {
      await sendFcm(worker.id, 'Service Completed ✅', `Booking #${booking.id} has been completed. Great work!`, {
        booking_id: String(booking.id), type: 'service_completed',
      });
    }

    // FCM -> customer app (separate Firebase project)
    await sendCustomerFcm(booking.user_id, 'Service Completed ✅', `Your service #${booking.id} has been completed.`, {
      booking_id: String(booking.id), type: 'service_completed',
    });

    // Live tracking: stop sharing now that the service has ended. Isolated - never affects the result above.
    try {
      await TrackingSession.update(
        { active: false, ended_at: now() },
        { where: { booking_id: booking.id, active: true } }
      );

      if (booking.worker_id) {
        const workerStillTracking = await TrackingSession.findOne({ where: { worker_id: booking.worker_id, active: true } });
        if (!workerStillTracking) {
          await firebaseRtdb.removeReference(`drivers/${booking.worker_id}`);
        }
      }
    } catch (e) {
      console.warn('endService: stop live tracking failed', { booking_id: booking.id, error: e.message });
    }

    return res.json({ success: true, message: '✅ Service has been ended.', status: 'completed' });
  },

  // GET /booking/timer  (stopwatch - counts UP)
  async serviceTimer(req, res) {
    await validate(req, { booking_id: 'required|exists:bookings,id' });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    // Service hasn't started yet -> no timer running
    if (!booking.service_started_at) {
      return res.json({
        success: true,
        booking_id: booking.id,
        status: booking.status,
        running: false,
        service_started_at: null,
        service_ended_at: null,
        elapsed_seconds: 0,
        elapsed_formatted: '00:00:00',
      });
    }

    const startedAt = dayjs(booking.service_started_at);
    const endPoint = booking.service_ended_at ? dayjs(booking.service_ended_at) : dayjs();
    // Carbon 3 diffInSeconds() returns a float (fractional seconds)
    const elapsedSeconds = Math.max(0, endPoint.diff(startedAt, 'millisecond') / 1000);

    return res.json({
      success: true,
      booking_id: booking.id,
      status: booking.status,
      running: !booking.service_ended_at,
      service_started_at: iso8601(startedAt),
      service_ended_at: booking.service_ended_at ? iso8601(booking.service_ended_at) : null,
      elapsed_seconds: elapsedSeconds,
      elapsed_formatted: gmdateHis(elapsedSeconds),
    });
  },

  // GET /booking/active-code
  async getActiveCode(req, res) {
    await validate(req, {
      booking_id: 'required|exists:bookings,id',
      role: 'required|in:customer,worker',
    });

    const booking = await findOrFail(Booking, req.input('booking_id'));

    // Customer -> start code (shown_to = customer); Worker -> close code (shown_to = worker)
    const isCustomer = req.input('role') === 'customer';
    const shownTo = isCustomer ? 'customer' : 'worker';
    const type = isCustomer ? 'start' : 'close';

    // latest() == order by created_at desc; booking_otps has no timestamps, so fall back to id desc like MySQL would
    const record = await BookingOtp.findOne({
      where: { ...forType(booking.id, type), shown_to: shownTo, ...activeWhere() },
      order: [['id', 'DESC']],
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'No active code found', code: null });
    }

    return res.json({
      success: true,
      booking_id: booking.id,
      type,
      code: record.otp,
      expires_at: record.expires_at,
      shown_to: record.shown_to,
      typed_by: record.typed_by,
    });
  },

  // POST /booking/verifycode/{booking}/{type}
  async verifyCode(req, res) {
    const booking = await findOrFail(Booking, req.params.booking);
    FirebaseService.requireMessaging();
    await validate(req, { otp: 'required|string' });

    const type = String(req.params.type).trim().toLowerCase();
    const code = String(req.input('otp')).trim();

    if (!['start', 'close'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type. Must be start or close' });
    }

    const record = await BookingOtp.findOne({
      where: { ...forType(booking.id, type), otp: code, ...activeWhere() },
    });

    if (!record) {
      return res.status(200).json({ success: false, message: 'Invalid or expired code' });
    }

    await BookingOtp.update(
      { verified_at: now() },
      { where: { ...forType(booking.id, type), otp: code, verified_at: null } }
    );

    const worker = booking.worker_id ? await User.findByPk(booking.worker_id) : null;

    if (type === 'start') {
      if (worker) await worker.update({ is_active: 0, is_assigned: 1 });

      const service = booking.service_id ? await Service.findByPk(booking.service_id) : null;
      const serviceDuration = service && service.duration_minutes ? parseInt(service.duration_minutes, 10) : 60;

      await booking.update({
        worker_reached_at: now(),
        service_started_at: now(),
        service_end_at: addMinutes(serviceDuration),
        status: 'inprogress',
        extension_count: 0,
        reminder_sent_at: null,
      });

      if (worker) {
        await sendFcm(worker.id, 'Service In Progress 🚀', `Booking #${booking.id} has started. Please complete the service.`, {
          booking_id: String(booking.id), type: 'service_inprogress',
        });
      }

      await sendCustomerFcm(booking.user_id, 'Service Started ✅', `Your service #${booking.id} has started.`, {
        booking_id: String(booking.id), type: 'service_started',
      });

      // eslint-disable-next-line eqeqeq
      if (service && service.category_id == instantCategoryId()) {
        await queue.dispatch('InstantServiceReminderJob', { booking_id: booking.id, bookingId: booking.id }, { delaySeconds: serviceDuration * 60 });
      }

      return res.json({ success: true, message: '✅ Code verified. Service has started.', status: 'inprogress' });
    }

    // close (note: PHP does not call recordSubscriptionVisit on this path)
    if (worker) await worker.update({ is_active: 1, is_assigned: 0 });

    await booking.update({ service_ended_at: now(), status: 'completed' });

    if (worker) {
      await sendFcm(worker.id, 'Service Completed ✅', `Booking #${booking.id} has been completed. Great work!`, {
        booking_id: String(booking.id), type: 'service_completed',
      });
    }

    await sendCustomerFcm(booking.user_id, 'Service Completed ✅', `Your service #${booking.id} has been completed.`, {
      booking_id: String(booking.id), type: 'service_completed',
    });

    return res.json({ success: true, message: '✅ Code verified. Service has completed.', status: 'completed' });
  },
};

module.exports = ctrl;
