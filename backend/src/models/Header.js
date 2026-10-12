module.exports = (sequelize, DataTypes) => {
  const Header = sequelize.define('Header', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    marquee_text: { type: DataTypes.TEXT },
    marquee_status: { type: DataTypes.BOOLEAN },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'cms_headers',
  });
  return Header;
};
