module.exports = (sequelize, DataTypes) => {
  const App = sequelize.define('App', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    short_heading: { type: DataTypes.STRING },
    heading: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    google_image: { type: DataTypes.STRING },
    google_status: { type: DataTypes.BOOLEAN },
    applestore_image: { type: DataTypes.STRING },
    applestore_status: { type: DataTypes.BOOLEAN },
    is_active: { type: DataTypes.BOOLEAN },
  }, {
    tableName: 'apps',
  });
  return App;
};
