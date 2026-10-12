import React from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  Key,
  Edit,
  Trash2,
} from "lucide-react";
import TableSkeleton from "../../components/TableSkeleton";

const RolesTable = ({
  roles,
  isLoading,
  onManagePermissions,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return <TableSkeleton columns={4} rows={5} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Role Name
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Access Level
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {roles.map((role) => {
            const Icon = role.icon || Shield;
            return (
              <tr
                key={role.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${role.color || "bg-gray-100 text-gray-600"}`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 block">
                        {role.roleName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {role.description}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {role.accessLevel}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      role.status === "Active"
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-gray-50 text-gray-600 border-gray-100"
                    }`}
                  >
                    {role.status === "Active" ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    {role.status}
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onManagePermissions(role)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Key size={14} /> Permissions
                    </button>
                    <button
                      onClick={() => onEdit(role)}
                      className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                    {role.roleName !== "Super Admin" && (
                      <button
                        onClick={() => onDelete(role.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RolesTable;
