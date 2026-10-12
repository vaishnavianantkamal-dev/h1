module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define('Setting', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    value: { type: DataTypes.TEXT, allowNull: true },
    description: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'settings' });

  // Setting::get($key, $default = null)
  Setting.get = async function get(key, defaultValue = null) {
    const setting = await Setting.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  };

  // Setting::set($key, $value, $description = null) - updateOrCreate with null fields filtered out
  Setting.set = async function set(key, value, description = null) {
    const values = {};
    if (value !== null && value !== undefined) values.value = value;
    if (description !== null && description !== undefined) values.description = description;
    const existing = await Setting.findOne({ where: { key } });
    if (existing) {
      if (Object.keys(values).length) await existing.update(values);
    } else {
      await Setting.create({ key, ...values });
    }
  };

  return Setting;
};
