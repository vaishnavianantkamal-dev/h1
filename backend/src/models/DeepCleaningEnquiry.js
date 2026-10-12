module.exports = (sequelize, DataTypes) => {
  const DeepCleaningEnquiry = sequelize.define('DeepCleaningEnquiry', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contact_no: { type: DataTypes.STRING(15), allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    requirements: { type: DataTypes.TEXT, allowNull: false },
  }, {
    tableName: 'deep_cleaning_enquiries',
  });
  return DeepCleaningEnquiry;
};
