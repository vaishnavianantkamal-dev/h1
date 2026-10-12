module.exports = (sequelize, DataTypes) => {
  // NOTE: no migration exists for this table; columns inferred from DeleteAccountController.
  const DeleteAccountRequest = sequelize.define('DeleteAccountRequest', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING },
    full_name: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    admin_reason: { type: DataTypes.TEXT },
  }, {
    tableName: 'delete_account_requests',
  });
  DeleteAccountRequest.STATUS_PENDING = 'pending';
  DeleteAccountRequest.STATUS_APPROVED = 'approved';
  DeleteAccountRequest.STATUS_REJECTED = 'rejected';
  return DeleteAccountRequest;
};
