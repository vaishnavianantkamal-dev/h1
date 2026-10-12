// Port of App\Http\Controllers\Auth\AdminForgotPasswordController
const { User, OtpVerification } = require('../../models');
const validate = require('../../utils/validate');
const hash = require('../../utils/hash');
const { dayjs } = require('../../utils/time');
const otpService = require('../../services/OtpService');

const isAdminLike = (user) => user.isAdmin() || Number(user.role_id) === 1;

// Eloquent isAdmin() lazy-loads the role relation
async function withRole(user) {
  if (user && !user.role && user.role_id) user.role = await user.getRole();
  return user;
}

module.exports = {
  /** Send OTP on WhatsApp for admin password reset. */
  async sendOtp(req, res) {
    await validate(req, { phone: 'required' });

    // Normalize to last 10 digits so it works with or without +91
    const rawPhone = String(req.input('phone')).replace(/\D/g, '');
    const phone = rawPhone.slice(-10);

    const user = await withRole(await User.findOne({ where: { phone } }));

    // Allow only admin-like users (role_id = 1 or isAdmin helper)
    if (!user || !isAdminLike(user)) {
      return res.status(404).json({
        success: false,
        message: 'Admin user with this phone not found',
      });
    }

    const otp = await otpService.generateOtp();

    // OtpVerification::updateOrCreate(['phone'=>$phone], [...])
    const values = {
      otp,
      expires_at: dayjs().add(5, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      attempts: 0,
      ip_address: String(req.ip || '').replace(/^::ffff:/, ''),
    };
    const existing = await OtpVerification.findOne({ where: { phone } });
    if (existing) await existing.update(values);
    else await OtpVerification.create({ phone, ...values });

    // Use existing WhatsApp OTP template (hobit_authentication)
    await otpService.sendWhatsappOtp(phone, otp);

    return res.json({
      success: true,
      message: 'OTP sent on WhatsApp',
    });
  },

  /** Verify OTP and reset admin password. */
  async reset(req, res) {
    await validate(req, {
      phone: 'required',
      otp: 'required|digits:6',
      password: 'required|string|min:6|confirmed',
    });

    const rawPhone = String(req.input('phone')).replace(/\D/g, '');
    const localPhone = rawPhone.slice(-10);

    const { Op } = require('sequelize');
    const otpRow = await OtpVerification.findOne({
      where: {
        phone: localPhone,
        otp: req.input('otp'),
        expires_at: { [Op.gte]: dayjs().format('YYYY-MM-DD HH:mm:ss') },
      },
    });

    if (!otpRow) {
      return res.status(422).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    const user = await withRole(await User.findOne({ where: { phone: localPhone } }));

    if (!user || !isAdminLike(user)) {
      return res.status(404).json({
        success: false,
        message: 'Admin user with this phone not found',
      });
    }

    await user.update({ password: hash.make(req.input('password')) });

    await otpRow.destroy();

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });
  },
};
