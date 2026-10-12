const { jsonField, boolField, addFillable } = require('./concerns/casts');

// A stored "service ending soon" alert for an admin recipient (unique per user_id + booking_id).
module.exports = (sequelize, DataTypes) => {
  const ServiceEndAlert = sequelize.define('ServiceEndAlert', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    booking_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    city_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    data: jsonField(DataTypes, 'data'), // cast array
    is_read: boolField(DataTypes, 'is_read', false),
  }, {
    tableName: 'service_end_alerts',
    scopes: {
      // scopeUnread
      unread: { where: { is_read: false } },
    },
  });

  addFillable(ServiceEndAlert, ['user_id', 'booking_id', 'city_id', 'title', 'message', 'data', 'is_read']);

  ServiceEndAlert.associate = (models) => {
    ServiceEndAlert.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    ServiceEndAlert.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
  };
  return ServiceEndAlert;
};
