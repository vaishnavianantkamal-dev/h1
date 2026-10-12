const { Op, where, fn, col } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const U = DataTypes.BIGINT.UNSIGNED;
  const Pincode = sequelize.define('Pincode', {
    id: { type: U, primaryKey: true, autoIncrement: true },
    area: { type: DataTypes.STRING, allowNull: false },
    pincode: { type: DataTypes.STRING(10), allowNull: false, unique: true },
    city: { type: DataTypes.STRING, allowNull: true },
    city_id: { type: U, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: false, defaultValue: 'India' },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'pincodes',
    paranoid: true,
    deletedAt: 'deleted_at',
    scopes: {
      // scopeActive
      active: { where: { is_active: true } },
      // scopeSearch($term)
      search: (term) => ({
        where: {
          [Op.or]: [
            { area: { [Op.like]: `%${term}%` } },
            { pincode: { [Op.like]: `%${term}%` } },
            { city: { [Op.like]: `%${term}%` } },
          ],
        },
      }),
    },
    hooks: {
      // static::saving - keep city / city_id in sync (driven by what actually changed)
      beforeSave: async (pincode) => {
        const { City } = sequelize.models;
        const cityIdDirty = pincode.changed('city_id');
        const cityDirty = pincode.changed('city');

        // city_id is the source of truth when explicitly set/changed (or there is no name to resolve from)
        if (pincode.city_id && (cityIdDirty || !pincode.city)) {
          const city = await City.findByPk(pincode.city_id);
          if (city) pincode.city = city.name;
          return;
        }

        // Otherwise resolve from the name (legacy flow, or the name changed)
        if (pincode.city && (cityDirty || !pincode.city_id)) {
          const city = await City.findOne({
            where: where(fn('LOWER', fn('TRIM', col('name'))), String(pincode.city).trim().toLowerCase()),
          });
          if (!city) {
            const { ValidationError } = require('../utils/errors');
            throw new ValidationError({ city: [`City "${pincode.city}" not found. Please select a valid city.`] });
          }
          pincode.city_id = city.id;
        }
      },
      // static::saved - clear cached serviceability-check result
      afterSave: async (pincode) => {
        const CacheService = require('../services/CacheService');
        await CacheService.forgetPincodeCheck(pincode.pincode);
        // If the 6-digit code itself was changed, also clear the old code's cache.
        if (pincode.changed('pincode')) {
          const old = pincode.previous('pincode');
          if (old != null) await CacheService.forgetPincodeCheck(old);
        }
      },
      // static::deleted
      afterDestroy: async (pincode) => {
        const CacheService = require('../services/CacheService');
        await CacheService.forgetPincodeCheck(pincode.pincode);
      },
    },
  });

  // NOTE: PHP city() belongsTo(City) is NOT declared: Sequelize forbids an association alias that equals the
  // existing string attribute `city` (pincodes.city). Use City.findByPk(pincode.city_id) where needed.
  Pincode.associate = () => {};

  return Pincode;
};
