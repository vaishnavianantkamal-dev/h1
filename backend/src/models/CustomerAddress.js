module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  // NOTE: no migration in this repo creates customer_address (only the add_home_details alter + an index);
  // base columns are taken from the PHP $fillable/$casts.
  const CustomerAddress = sequelize.define('CustomerAddress', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    customer_id: { type: U, allowNull: false },
    house_no: { type: DataTypes.STRING, allowNull: true },
    building: { type: DataTypes.STRING, allowNull: true },
    locality: { type: DataTypes.STRING, allowNull: true },
    landmark: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    pincode: { type: DataTypes.STRING, allowNull: true },
    label: { type: DataTypes.STRING, allowNull: true },
    label_name: { type: DataTypes.STRING(50), allowNull: true },
    is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    property_type: { type: DataTypes.STRING(10), allowNull: true },
    residents: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    bathrooms: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    balconies: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    has_pets: { type: DataTypes.BOOLEAN, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    formatted_address: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'customer_address',
    scopes: {
      // scopeDefault
      default: { where: { is_default: true } },
    },
  });

  CustomerAddress.associate = (models) => {
    CustomerAddress.belongsTo(models.User, { foreignKey: 'customer_id', as: 'customer' });
  };
  // getShortAddressAttribute (not in $appends, so not serialised): use addr.getShortAddress()
  CustomerAddress.prototype.getShortAddress = function getShortAddress() {
    return [this.house_no, this.building, this.locality].filter(Boolean).join(', ');
  };

  return CustomerAddress;
};
