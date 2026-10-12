// Laravel 'array' cast on a plain string column: json_decode on read, json_encode on write.
const phpJsonEncode = require('../utils/phpJsonEncode');
const jsonCast = (field) => ({
  get() {
    const v = this.getDataValue(field);
    if (v === null || v === undefined) return null;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch (e) { return null; }
  },
  set(v) {
    this.setDataValue(field, v === null || v === undefined ? null : phpJsonEncode(v));
  },
});

module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const Worker = sequelize.define('Worker', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    user_id: { type: U, allowNull: false },
    service_category: { type: DataTypes.STRING, allowNull: true },
    wallet_balance: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total_earning: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    kyc_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    full_name: { type: DataTypes.STRING, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    photo: { type: DataTypes.STRING, allowNull: true },
    id_type: { type: DataTypes.STRING, allowNull: true, ...jsonCast('id_type') },
    id_number: { type: DataTypes.STRING, allowNull: true, ...jsonCast('id_number') },
    id_front_path: { type: DataTypes.STRING, allowNull: true, ...jsonCast('id_front_path') },
    id_back_path: { type: DataTypes.STRING, allowNull: true, ...jsonCast('id_back_path') },
    skills: { type: DataTypes.JSON, allowNull: true },
    preferred_area: { type: DataTypes.STRING, allowNull: true },
    current_address: { type: DataTypes.STRING, allowNull: true },
    permanent_address: { type: DataTypes.STRING, allowNull: true },
    available_days: { type: DataTypes.JSON, allowNull: true },
    available_time: { type: DataTypes.JSON, allowNull: true },
    account_holder_name: { type: DataTypes.STRING, allowNull: true },
    account_no: { type: DataTypes.STRING, allowNull: true },
    bank_name: { type: DataTypes.STRING, allowNull: true },
    ifsc_code: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'workers',
    scopes: {
      // scopeApproved
      approved: { where: { kyc_status: 'approved' } },
      // scopeActive: whereHas('user', is_active = true)
      active: () => ({
        include: [{ model: sequelize.models.User, as: 'user', required: true, attributes: [], where: { is_active: true } }],
      }),
    },
  });

  Worker.associate = (models) => {
    Worker.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Worker.hasMany(models.Booking, { foreignKey: 'worker_id', sourceKey: 'user_id', as: 'bookings', constraints: false });
    Worker.hasMany(models.BookingRating, { foreignKey: 'worker_id', as: 'ratings', constraints: false });
  };

  // Helper: eligible for assignment (needs `user` loaded)
  Worker.prototype.isEligibleForAssignment = function isEligibleForAssignment() {
    return this.kyc_status === 'approved'
      && !!this.user
      && !!this.user.is_active
      && !!this.user.is_phone_verified;
  };

  Worker.prototype.averageRating = async function averageRating() {
    const avg = await sequelize.models.BookingRating.aggregate('rating', 'avg', { where: { worker_id: this.id }, dataType: DataTypes.FLOAT });
    return Math.round((Number(avg) || 0) * 10) / 10;
  };

  Worker.prototype.ratingsCount = async function ratingsCount() {
    return sequelize.models.BookingRating.count({ where: { worker_id: this.id } });
  };

  return Worker;
};
