// Port of App\Models\Concerns\HasResolvablePrice (trait) - mixes methods into a Sequelize model.
// Used by Service and ServicePlan (columns price / festival_price / member_price).
function applyResolvablePrice(Model) {
  /**
   * The single price to CHARGE: the lowest of every price this customer currently qualifies for.
   * Normal price is always a candidate; festival/member prices only when they apply and are set.
   */
  Model.prototype.resolvedPrice = function resolvedPrice(isMember = false, isFestival = false) {
    const candidates = [Number(this.price)];

    if (isFestival && this.festival_price !== null && this.festival_price !== undefined) {
      candidates.push(Number(this.festival_price));
    }
    if (isMember && this.member_price !== null && this.member_price !== undefined) {
      candidates.push(Number(this.member_price));
    }
    return Math.min(...candidates);
  };

  /**
   * The price block to return in API responses for DISPLAY.
   *  - non-member: price + festival_price
   *  - member: member_price (falls back to price if unset) + festival_price
   */
  Model.prototype.pricePayload = function pricePayload(isMember = false) {
    const payload = { is_member: isMember };

    if (isMember) {
      payload.member_price = this.member_price !== null && this.member_price !== undefined
        ? Number(this.member_price)
        : Number(this.price);
    } else {
      payload.price = Number(this.price);
    }

    payload.festival_price = this.festival_price !== null && this.festival_price !== undefined
      ? Number(this.festival_price)
      : null;

    return payload;
  };
  return Model;
}

module.exports = applyResolvablePrice;
module.exports.applyResolvablePrice = applyResolvablePrice;
