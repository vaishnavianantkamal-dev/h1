module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const Customer = sequelize.define('Customer', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    user_id: { type: U, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'customers', paranoid: true, deletedAt: 'deleted_at' });

  Customer.associate = (models) => {
    Customer.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };
  return Customer;
};
