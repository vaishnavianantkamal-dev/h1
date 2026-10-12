// Port of App\Http\Controllers\Web\OtpVerifyController
// show() renders otp/verify; verify() is used by POST /verify-otp/:booking/:type (web) AND GET /api/verify-otp/:booking/:type.
// `back()->withErrors(...)` redirects (302) to the previous URL with the error flashed in the session (see middleware/webSession.js).
const { Op } = require('sequelize');
const { Booking, BookingOtp, User, Service } = require('../../models');
const validate = require('../../utils/validate');
const config = require('../../config');
const { abort, ValidationError } = require('../../utils/errors');
const { findOrFail } = require('../../utils/binding');
const { dayjs } = require('../../utils/time');
const views = require('./views');
const webSession = require('../../middleware/webSession');
const { expectsJson } = require('../../middleware/laravel');

const nowDate = () => dayjs().toDate();

const ctrl = {
  async show(req, res) {
    await findOrFail(Booking, req.params.booking);
    const { type } = req.params;
    if (!['start', 'close'].includes(type)) abort(404);
    return res.type('html').send(views.otpVerify(req.session.errors('otp')[0], { token: req.session.token, base: webSession.baseUrl(req) }));
  },

  async verify(req, res) {
    const booking = await findOrFail(Booking, req.params.booking, { include: [{ model: Service, as: 'service', required: false }] });
    const { type } = req.params;

    try {
      await validate(req, { otp: 'required|string' });
    } catch (e) {
      // Laravel: non-JSON requests are redirected back (previous URL) with the validation errors flashed
      if (e instanceof ValidationError && !expectsJson(req)) return webSession.redirectBack(req, res, e.errors);
      throw e;
    }

    const otp = req.input('otp');
    const verifierType = type === 'start' ? 'customer' : 'worker';

    const verifierOtp = await BookingOtp.findOne({
      where: {
        booking_id: booking.id,
        type,
        receiver_type: verifierType,
        otp,
        verified_at: null,
        expires_at: { [Op.gt]: nowDate() },
      },
    });

    if (!verifierOtp) {
      return webSession.redirectBack(req, res, { otp: ['Invalid or expired OTP'] });
    }

    await BookingOtp.update({ verified_at: nowDate() }, {
      where: { booking_id: booking.id, type, otp, verified_at: null },
    });

    const worker = await findOrFail(User, booking.worker_id);

    let message;

    // ===== START OTP =====
    if (type === 'start') {
      await worker.update({ is_active: 0, is_assigned: 1 });

      await booking.update({
        worker_reached_at: nowDate(),
        service_started_at: nowDate(),
        status: 'inprogress',
      });

      // Instant check via category
      const isInstant = !!(booking.service && booking.service.category_id == config.services.instantCategoryId); // eslint-disable-line eqeqeq

      if (isInstant && booking.service.duration_minutes) {
        const serviceEndAt = dayjs().add(booking.service.duration_minutes, 'minute').toDate();

        await booking.update({
          service_end_at: serviceEndAt,
          extension_count: 0,
          reminder_sent_at: null,
        });
      }

      message = 'OTP verified. Service has started.';
    }

    // ===== CLOSE OTP =====
    if (type === 'close') {
      await worker.update({ is_active: 1, is_assigned: 0 });

      await booking.update({ service_ended_at: nowDate(), status: 'completed' });

      message = '✅ OTP verified. Service has completed.';
    }

    const otpRows = await BookingOtp.findAll({
      where: { booking_id: booking.id, type, otp },
      attributes: ['receiver_phone'],
    });
    const phones = [...new Set(otpRows.map((r) => r.receiver_phone))];

    const otpService = require('../../services/OtpService');
    for (const phone of phones) {
      await otpService.sendWhatsapp(phone, message);
    }

    return res.type('html').send(views.otpSuccess(message));
  },
};

module.exports = ctrl;
