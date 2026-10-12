module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const WorkerKyc = sequelize.define('WorkerKyc', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    worker_id: { type: U, allowNull: false },
    client_id: { type: DataTypes.STRING, allowNull: true, unique: true },
    status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), allowNull: false, defaultValue: 'pending' },
    aadhaar_number_masked: { type: DataTypes.STRING, allowNull: true },
    full_name: { type: DataTypes.STRING, allowNull: true },
    dob: { type: DataTypes.DATEONLY, allowNull: true }, // cast date:Y-m-d
    gender: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    photo_base64: { type: DataTypes.TEXT('long'), allowNull: true },
    raw_response: { type: DataTypes.JSON, allowNull: true },
    verified_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'worker_kycs' });

  // $hidden = ['photo_base64', 'raw_response']
  WorkerKyc.prototype.toJSON = function toJSON() {
    const values = { ...this.get({ plain: true }) };
    delete values.photo_base64;
    delete values.raw_response;
    return values;
  };

  WorkerKyc.associate = (models) => {
    WorkerKyc.belongsTo(models.User, { foreignKey: 'worker_id', as: 'worker' });
  };
  return WorkerKyc;
};
