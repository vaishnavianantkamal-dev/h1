const { flagField, addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const ExtraTimeFee = sequelize.define('ExtraTimeFee', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    service_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    minutes: { type: DataTypes.INTEGER, allowNull: false },
    fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    festival_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    is_active: flagField(DataTypes, 'is_active', 1), // no cast in PHP (0/1)
  }, { tableName: 'extra_time_fees' });

  addFillable(ExtraTimeFee, ['service_id', 'minutes', 'fee', 'festival_fee', 'is_active']);

  ExtraTimeFee.associate = (models) => {
    ExtraTimeFee.belongsTo(models.Service, { foreignKey: 'service_id', as: 'service' });
  };

  // getFinalFeeAttribute (accessor, not in $appends -> plain property, not serialised)
  Object.defineProperty(ExtraTimeFee.prototype, 'final_fee', {
    get() {
      return this.festival_fee !== null && this.festival_fee !== undefined ? this.festival_fee : this.fee;
    },
  });

  return ExtraTimeFee;
};
