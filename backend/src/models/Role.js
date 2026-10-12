module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, { tableName: 'roles' });

  // role_permissions pivot (id, role_id, permission_id, timestamps) - shared with Permission.roles
  const RolePermission = sequelize.define('RolePermission', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    permission_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  }, { tableName: 'role_permissions' });

  Role.associate = (models) => {
    Role.belongsToMany(models.Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
    Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
  };
  return Role;
};
