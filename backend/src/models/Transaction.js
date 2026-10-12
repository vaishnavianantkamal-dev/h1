module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const Transaction = sequelize.define('Transaction', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    payment_id: { type: DataTypes.STRING, allowNull: false, unique: true }, // Razorpay payment ID
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    amount_refunded: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'INR' },
    method: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false },
    contact: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
    order_id: { type: DataTypes.STRING, allowNull: true },
    user_id: { type: U, allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'transactions' });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };
  return Transaction;
};
