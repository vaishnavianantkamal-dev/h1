const { jsonField, boolField, addFillable } = require('./concerns/casts');

module.exports = (sequelize, DataTypes) => {
  const Addon = sequelize.define('Addon', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    images: jsonField(DataTypes, 'images'), // cast array
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: boolField(DataTypes, 'status', true),
  }, { tableName: 'addons' });

  addFillable(Addon, ['name', 'description', 'images', 'price', 'status']);

  return Addon;
};
