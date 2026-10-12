module.exports = (sequelize, DataTypes) => {
  const HomeCategoryDoDont = sequelize.define('HomeCategoryDoDont', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    home_category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('do', 'dont'), allowNull: false },
    text: { type: DataTypes.STRING, allowNull: false },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  }, { tableName: 'home_category_dos_donts' });

  HomeCategoryDoDont.associate = (models) => {
    HomeCategoryDoDont.belongsTo(models.HomeCategory, { foreignKey: 'home_category_id', as: 'homeCategory' });
  };

  return HomeCategoryDoDont;
};
