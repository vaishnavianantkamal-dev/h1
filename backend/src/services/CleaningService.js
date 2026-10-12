// Port of app/Services/CleaningService.php
const { Op } = require('sequelize');
const { findOrFail } = require('../utils/binding');

class CleaningService {
  /** Calculate final price for a service */
  async calculatePrice(servicePricingId, extraMinutes = 0, isFestival = false) {
    const { ServicePricing, ExtraTimeFee } = require('../models');
    const pricing = await findOrFail(ServicePricing, servicePricingId, { include: [{ association: 'service' }] });

    // Base price
    const basePrice = isFestival && pricing.festival_price ? pricing.festival_price : pricing.price;

    // Extra time fee
    let extraFee = 0;
    if (extraMinutes > 0) {
      const rule = await ExtraTimeFee.findOne({
        where: { service_id: pricing.service_id, minutes: { [Op.lte]: extraMinutes }, is_active: true },
        order: [['minutes', 'DESC']],
      });
      if (rule) {
        extraFee = isFestival && rule.festival_fee ? rule.festival_fee : rule.fee;
      }
    }

    return {
      base_price: basePrice,
      extra_fee: extraFee,
      total_amount: Number(basePrice) + Number(extraFee),
    };
  }
}

module.exports = new CleaningService();
module.exports.CleaningService = CleaningService;
