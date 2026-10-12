import React, { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import {
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useUpdateRolePermissionsMutation,
  useGetRoleQuery,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useRegisterMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserProfileQuery,
  useGetCitiesQuery,
} from "../../api/apiSlice";
import toast from "react-hot-toast";
import RolesTable from "./RolesTable";
import UsersTable from "./UsersTable";
import RoleModal from "./RoleModal";
import PermissionsModal from "./PermissionsModal";
import UserModal from "./UserModal";
import UserDetailsModal from "./UserDetailsModal";
import apiClient from "../../api/client";

const UserTypesRoles = () => {
  const [activeTab, setActiveTab] = useState("roles"); // 'roles' or 'users'
  const [searchTerm, setSearchTerm] = useState("");
  const [usersPage, setUsersPage] = useState(1);

  // Roles State
  const {
    data: apiRoles = [],
    isLoading: isLoadingRoles,
    refetch: refetchRoles,
  } = useGetRolesQuery();
  const [roles, setRoles] = useState([]);
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [updateRolePermissions] = useUpdateRolePermissionsMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [registerUser] = useRegisterMutation();
  const { data: cities = [] } = useGetCitiesQuery();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState("add");
  const [selectedRole, setSelectedRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    roleName: "",
    description: "",
    accessLevel: "Low Level",
    status: "Active",
  });

  // View User Profile State
  const [viewingUserId, setViewingUserId] = useState(null);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const { data: userProfile, isLoading: isLoadingUserProfile } =
    useGetUserProfileQuery(viewingUserId, {
      skip: !viewingUserId,
    });

  const handleViewUserClick = (user) => {
    setViewingUserId(user.id);
    setIsUserDetailsModalOpen(true);
  };

  // Permissions State
  const { data: apiPermissions = [] } = useGetPermissionsQuery();
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState([]);
  const [editingRolePermissions, setEditingRolePermissions] = useState(null);

  // Fetch specific role details when editing permissions
  const {
    data: roleDetails,
    isLoading: isLoadingRoleDetails,
    isFetching: isFetchingRoleDetails,
  } = useGetRoleQuery(editingRolePermissions?.id, {
    skip: !editingRolePermissions,
  });

  useEffect(() => {
    if (
      roleDetails &&
      editingRolePermissions &&
      roleDetails.id === editingRolePermissions.id
    ) {
      const rolePerms = roleDetails.permissions || [];
      const rolePermIds = rolePerms.map((p) => p.id || p);
      setCurrentPermissions(rolePermIds);
    }
  }, [roleDetails, editingRolePermissions]);

  // Users State
  const {
    data: usersResponse = { data: [], meta: null },
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useGetUsersQuery({ page: usersPage });
  const apiUsers = usersResponse.data;
  const usersMeta = usersResponse.meta;
  const [users, setUsers] = useState([]);
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState("add");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    password_confirmation: "",
    role_id: "",
    city_id: "",
    status: "Active",
    firm: "",
  });

  useEffect(() => {
    if (apiRoles && Array.isArray(apiRoles)) {
      const mapped = apiRoles.map((r) => ({
        id: r.id,
        roleName: r.name,
        description: r.description,
        accessLevel: "Standard",
        status: "Active",
        permissions: r.permissions || [],
      }));
      setRoles(mapped);
    }
  }, [apiRoles]);

  useEffect(() => {
    // Load Users
    if (apiUsers && Array.isArray(apiUsers)) {
      setUsers(
        apiUsers.map((user) => ({
          ...user,
          role: user.role?.name || "No Role",
          status: user.is_active ? "Active" : "Inactive",
          firm: user.firm || "",
        })),
      );
    }
  }, [apiUsers]);

  // --- Roles Handlers ---
  const handleAddRoleClick = () => {
    setRoleModalMode("add");
    setRoleFormData({
      roleName: "",
      description: "",
      accessLevel: "Low Level",
      status: "Active",
    });
    setIsRoleModalOpen(true);
  };

  const handleEditRoleClick = (role) => {
    setRoleModalMode("edit");
    setSelectedRole(role);
    setRoleFormData({
      roleName: role.roleName,
      description: role.description,
      accessLevel: role.accessLevel,
      status: role.status,
    });
    setIsRoleModalOpen(true);
  };

  const handleRoleSave = (e) => {
    e.preventDefault();
    if (roleModalMode === "add") {
      const payload = {
        name: roleFormData.roleName,
        description: roleFormData.description,
      };
      createRole(payload)
        .unwrap()
        .then(() => {
          toast.success("Role created successfully");
          setIsRoleModalOpen(false);
          refetchRoles();
        })
        .catch((err) => {
          console.error("Create role error:", err);
          toast.error("Failed to create role");
        });
    } else {
      const payload = {
        id: selectedRole.id,
        name: roleFormData.roleName,
        description: roleFormData.description,
      };
      updateRole(payload)
        .unwrap()
        .then(() => {
          toast.success("Role updated successfully");
          setIsRoleModalOpen(false);
          refetchRoles();
        })
        .catch((err) => {
          console.error("Update role error:", err);
          toast.error("Failed to update role");
        });
    }
  };

  const handleDeleteRole = (roleId) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      deleteRole(roleId)
        .unwrap()
        .then(() => {
          toast.success("Role deleted");
          refetchRoles();
        })
        .catch((err) => {
          console.error("Delete role error:", err);
          toast.error("Failed to delete role");
        });
    }
  };

  // --- Permissions Handlers ---
  const handleManagePermissions = (role) => {
    setEditingRolePermissions(role);
    // Initial setup from list (optional, but good for immediate feedback if data exists)
    // We rely on useGetRoleQuery for the full/latest permissions
    const rolePerms = role.permissions || [];
    const rolePermIds = rolePerms.map((p) => p.id || p);
    setCurrentPermissions(rolePermIds);
    setIsPermissionsModalOpen(true);
  };

  const togglePermission = (permissionId) => {
    if (currentPermissions.includes(permissionId)) {
      setCurrentPermissions(
        currentPermissions.filter((id) => id !== permissionId),
      );
    } else {
      setCurrentPermissions([...currentPermissions, permissionId]);
    }
  };

  const handleSavePermissions = () => {
    if (!editingRolePermissions) return;

    const payload = {
      id: editingRolePermissions.id,
      permission_ids: currentPermissions,
    };

    updateRolePermissions(payload)
      .unwrap()
      .then(() => {
        toast.success(
          `Permissions updated for ${editingRolePermissions.roleName}`,
        );
        setIsPermissionsModalOpen(false);
        setEditingRolePermissions(null);
        setCurrentPermissions([]);
        refetchRoles();
      })
      .catch((err) => {
        console.error("Update permissions error:", err);
        toast.error("Failed to update permissions");
      });
  };

  // --- Users Handlers ---
  const handleAddUserClick = () => {
    setUserModalMode("add");
    setUserFormData({
      name: "",
      phone: "",
      email: "",
      password: "",
      password_confirmation: "",
      role_id: roles[0]?.id || "",
      city_id: "",
      status: "Active",
      firm: "",
      images: [],
      newImages: [],
    });
    setIsUserModalOpen(true);
  };

  const handleEditUserClick = (user) => {
    setUserModalMode("edit");
    setSelectedUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "", // Don't show password, allow reset
      password_confirmation: "",
      role_id: user.role_id || user.role?.id || "",
      city_id: user.city_id ?? user.city?.id ?? "",
      status: user.status,
      firm: user.firm || "",
      images: user.images || [], // Pass existing images
      newImages: [],
    });
    setIsUserModalOpen(true);
  };

  const handleUserSave = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append("name", userFormData.name);
      formData.append("phone", userFormData.phone);
      formData.append("email", userFormData.email);
      formData.append("role_id", userFormData.role_id);
      formData.append("status", userFormData.status === "Active" ? "1" : "0");
      if (userFormData.firm) {
        formData.append("firm", userFormData.firm);
      }
      // city_id is required for city-scoped roles (City Admin / Coordinator).
      if (userFormData.city_id) {
        formData.append("city_id", userFormData.city_id);
      }

      if (userFormData.password) {
        formData.append("password", userFormData.password);
        formData.append(
          "password_confirmation",
          userFormData.password_confirmation || userFormData.password,
        );
      }

      // Handle existing images (that were not removed)
      if (userFormData.images && userFormData.images.length > 0) {
        userFormData.images.forEach((img, index) => {
          formData.append(`existing_images[${index}][type]`, img.type);
          formData.append(`existing_images[${index}][path]`, img.path);
        });
      }

      // Handle new images
      if (userFormData.newImages && userFormData.newImages.length > 0) {
        userFormData.newImages.forEach((img, index) => {
          if (img.file && img.type) {
            formData.append(`new_images[${index}][type]`, img.type);
            formData.append(`new_images[${index}][file]`, img.file);
          }
        });
      }

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      if (userModalMode === "add") {
        await registerUser(formData).unwrap();
        toast.success("User created successfully");
      } else {
        // spoof PUT for multipart/form-data
        await apiClient.post(
          `/api/admin/users/${selectedUser.id}?_method=PUT`,
          formData,
          config,
        );
        toast.success("User updated successfully");
      }

      setIsUserModalOpen(false);
      refetchUsers();
    } catch (err) {
      console.error("Save user error:", err);
      toast.error(err?.data?.message || err?.message || "Failed to save user");
    }
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUser(userId)
        .unwrap()
        .then(() => {
          toast.success("User deleted");
          refetchUsers();
        })
        .catch((err) => {
          console.error("Delete user error:", err);
          toast.error("Failed to delete user");
        });
    }
  };

  // Filtering
  const filteredRoles = roles.filter((role) =>
    (role.roleName || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredUsers = users.filter(
    (user) =>
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage roles, permissions, and system users
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "roles"
                ? "bg-primary text-white shadow-lg shadow-blue-500/30"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-primary text-white shadow-lg shadow-blue-500/30"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            Users Management
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-semibold text-gray-900">
            {activeTab === "roles" ? "All Roles" : "All Users"}
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "roles" ? "Search roles..." : "Search users..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
              />
            </div>
            <button
              onClick={
                activeTab === "roles" ? handleAddRoleClick : handleAddUserClick
              }
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add New</span>
            </button>
          </div>
        </div>

        {activeTab === "roles" && (
          <RolesTable
            roles={filteredRoles}
            isLoading={isLoadingRoles}
            onManagePermissions={handleManagePermissions}
            onEdit={handleEditRoleClick}
            onDelete={handleDeleteRole}
          />
        )}

        {activeTab === "users" && (
          <UsersTable
            users={filteredUsers}
            isLoading={isLoadingUsers}
            onEdit={handleEditUserClick}
            onDelete={handleDeleteUser}
            onView={handleViewUserClick}
            currentPage={usersMeta?.current_page || usersPage}
            totalPages={usersMeta?.last_page || 1}
            totalItems={usersMeta?.total || 0}
            fromItem={usersMeta?.from || 0}
            toItem={usersMeta?.to || 0}
            onPageChange={setUsersPage}
          />
        )}
      </div>

      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        mode={roleModalMode}
        formData={roleFormData}
        setFormData={setRoleFormData}
        onSubmit={handleRoleSave}
      />

      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setEditingRolePermissions(null);
          setCurrentPermissions([]);
        }}
        editingRole={editingRolePermissions}
        permissions={apiPermissions}
        currentPermissions={currentPermissions || []}
        togglePermission={togglePermission}
        onSave={handleSavePermissions}
        isLoading={
          isLoadingRoleDetails ||
          isFetchingRoleDetails ||
          currentPermissions === null
        }
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        mode={userModalMode}
        formData={userFormData}
        setFormData={setUserFormData}
        onSubmit={handleUserSave}
        roles={roles}
        cities={cities}
      />

      <UserDetailsModal
        isOpen={isUserDetailsModalOpen}
        onClose={() => {
          setIsUserDetailsModalOpen(false);
          setViewingUserId(null);
        }}
        user={userProfile}
        isLoading={isLoadingUserProfile}
      />
    </div>
  );
};

export default UserTypesRoles;
