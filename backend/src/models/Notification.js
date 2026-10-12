module.exports = (sequelize, DataTypes) => {
  // NOTE: no migration exists for this table; columns inferred from the Eloquent model/NotificationController.
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED },
    type: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    message: { type: DataTypes.TEXT },
    // 'array' cast: json_encode on write, json_decode on read (same as Eloquent, incl. pre-encoded strings).
    data: {
      type: DataTypes.TEXT('long'),
      get() {
        const v = this.getDataValue('data');
        if (v === null || v === undefined) return null;
        if (typeof v !== 'string') return v;
        try { return JSON.parse(v); } catch (e) { return null; }
      },
      set(v) { this.setDataValue('data', v === null || v === undefined ? null : JSON.stringify(v)); },
    },
    sender_id: { type: DataTypes.BIGINT.UNSIGNED },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED },
    worker_id: { type: DataTypes.BIGINT.UNSIGNED },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'notifications',
    paranoid: true,
    deletedAt: 'deleted_at',
    scopes: {
      unread: { where: { is_read: false } },
      read: { where: { is_read: true } },
      ofType: (type) => ({ where: { type } }),
    },
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Notification.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
    Notification.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    Notification.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker' });
  };

  return Notification;
};
