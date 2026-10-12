import React from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { ROLES } from "../constants/roles";

const PermissionGuard = ({ children, requiredPermission }) => {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(storedUser);
    const userRole = typeof user.role === "object" ? user.role.name : user.role;
    const permissions = user.permissions || [];

    // Robust Super Admin check: by name or by role slug
    const isSuperAdmin =
      userRole === ROLES.SUPER_ADMIN ||
      user.role_slug === "super-admin" ||
      user._role_details?.slug === "super-admin";

    // Super Admin has access to everything
    if (isSuperAdmin) {
      return children;
    }

    // Check if user has the required permission
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 mb-8 max-w-md">
            You do not have the required permissions to access this page. Please
            contact your administrator if you believe this is an error.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Go Back
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-primary text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return children;
  } catch (error) {
    console.error("Permission check failed", error);
    return <Navigate to="/login" replace />;
  }
};

export default PermissionGuard;
