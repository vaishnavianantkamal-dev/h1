// Hobit1: service booking requests submitted from the website's service cards
// (electrician, plumber, carpenter, ...). New table, created by `npm run db:setup`.
module.exports = (sequelize, DataTypes) => {
  const ServiceRequest = sequelize.define('ServiceRequest', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    // Service picked on the website (ids come from frontend/src/data/hobit1Services.js)
    service_id: { type: DataTypes.STRING(100), allowNull: false },
    service_name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: false },
    sub_category: { type: DataTypes.STRING(100), allowNull: true },
    // Customer contact
    name: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(15), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: true },
    // Location
    address: { type: DataTypes.TEXT, allowNull: false },
    locality: { type: DataTypes.STRING(150), allowNull: true },
    landmark: { type: DataTypes.STRING(150), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Nashik' },
    pincode: { type: DataTypes.STRING(6), allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    // Visit + payment
    preferred_date: { type: DataTypes.DATEONLY, allowNull: true },
    preferred_time: { type: DataTypes.STRING(50), allowNull: true },
    payment_method: { type: DataTypes.STRING(30), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    // Admin follow-up
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'new' },
  }, {
    tableName: 'service_requests',
  });

  ServiceRequest.STATUSES = ['new', 'contacted', 'confirmed', 'completed', 'cancelled'];
  ServiceRequest.PAYMENT_METHODS = ['cash', 'upi', 'online'];
  ServiceRequest.TIME_SLOTS = ['morning', 'afternoon', 'evening'];

  return ServiceRequest;
};
