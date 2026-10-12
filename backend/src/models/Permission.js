module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  }, { tableName: 'permissions' });

  Permission.associate = (models) => {
    // pivot model RolePermission is defined in Role.js
    Permission.belongsToMany(models.Role, { through: sequelize.models.RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });
  };
  return Permission;
};
