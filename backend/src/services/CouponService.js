// Port of app/Services/CouponService.php
const sequelize = require('../config/db');
const { HttpError } = require('../utils/errors');

class CouponService {
  /**
   * Apply coupon to a booking - call this after booking is created/confirmed
   * Returns { success, message, discount?, original_amount?, final_amount? }
   */
  async apply(couponId, userId, booking) {
    const { Coupon, CouponUsage } = require('../models');
    return sequelize.transaction(async (t) => {
      // Lock coupon row to prevent race conditions
      const coupon = await Coupon.findByPk(couponId, { lock: t.LOCK.UPDATE, transaction: t });
      if (!coupon) throw new HttpError(404, `No query results for model [App\\Models\\Coupon] ${couponId}`);

      const result = await coupon.validate(userId, Number(booking.amount));

      if (!result.valid) {
        return { success: false, message: result.message };
      }

      const discount = result.discount;

      // Record usage
      await CouponUsage.create(
        { coupon_id: coupon.id, user_id: userId, booking_id: booking.id, discount_amount: discount },
        { transaction: t }
      );

      // Increment used count
      await coupon.increment('used_count', { transaction: t });

      // Update booking amounts
      await booking.update(
        {
          coupon_id: coupon.id,
          original_amount: booking.amount,
          discount_amount: discount,
          amount: Math.max(0, booking.amount - discount),
        },
        { transaction: t }
      );

      return {
        success: true,
        message: 'Coupon applied successfully.',
        discount,
        original_amount: booking.original_amount,
        final_amount: booking.amount,
      };
    });
  }

  /** Reverse coupon if booking is cancelled */
  async reverse(booking, outerTx) {
    if (!booking.coupon_id) return;
    const { Coupon, CouponUsage } = require('../models');

    // PHP's nested DB::transaction joins the caller's transaction; reuse it when one is passed.
    const run = outerTx ? (fn) => fn(outerTx) : (fn) => sequelize.transaction(fn);
    await run(async (t) => {
      await CouponUsage.destroy({ where: { booking_id: booking.id }, transaction: t });
      await Coupon.decrement('used_count', { by: 1, where: { id: booking.coupon_id }, transaction: t });
      await booking.update(
        { amount: booking.original_amount, discount_amount: 0, original_amount: null, coupon_id: null },
        { transaction: t }
      );
    });
  }
}

module.exports = new CouponService();
module.exports.CouponService = CouponService;
