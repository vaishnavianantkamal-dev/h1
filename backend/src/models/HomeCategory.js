const { storageUrl } = require('../utils/storage');

module.exports = (sequelize, DataTypes) => {
  const HomeCategory = sequelize.define('HomeCategory', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    // array of stored public-disk paths. Eloquent `array` cast writes PHP json_encode() output (escaped slashes, \uXXXX).
    images: {
      type: DataTypes.TEXT('long'),
      get() {
        const v = this.getDataValue('images');
        if (v === null || v === undefined || typeof v !== 'string') return v;
        try { return JSON.parse(v); } catch (_) { return null; }
      },
      set(v) {
        this.setDataValue('images', v === null || v === undefined ? null
          : JSON.stringify(v).replace(/\//g, '\\/').replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`));
      },
    },
    note: { type: DataTypes.TEXT },
    status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  }, { tableName: 'home_categories' });

  HomeCategory.associate = (models) => {
    HomeCategory.hasMany(models.HomeCategoryDoDont, { foreignKey: 'home_category_id', as: 'dosDonts' });
  };

  // Eloquent `image_urls` accessor (NOT in $appends, so it is a plain property, not part of toJSON):
  // full public URLs for the stored image paths. Raw `images` stays as-is for update/remove.
  const imageUrls = function imageUrls() {
    const images = this.images;
    return (Array.isArray(images) ? images : []).map((p) => storageUrl(p));
  };
  HomeCategory.prototype.imageUrls = imageUrls;
  Object.defineProperty(HomeCategory.prototype, 'image_urls', { get: imageUrls, configurable: true });

  return HomeCategory;
};
