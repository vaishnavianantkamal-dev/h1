import React from "react";
import { Mail, Edit, Trash2, Eye } from "lucide-react";
import TableSkeleton from "../../components/TableSkeleton";

const UsersTable = ({
  users,
  isLoading,
  onEdit,
  onDelete,
  onView = () => { },
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  fromItem = 0,
  toItem = 0,
  onPageChange,
}) => {
  if (isLoading) {
    return <TableSkeleton columns={4} rows={5} />;
  }
  return (
    <div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Role
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
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {(user.name || "").charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      {user.name}
                    </span>
                    {user.firm && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-tight block">
                        {user.firm}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      {user.phone}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-6">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {user.role}
                </span>
              </td>
              <td className="py-4 px-6">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.status === "Active"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-gray-50 text-gray-600 border-gray-100"
                    }`}
                >
                  {user.status}
                </span>
              </td>
              <td className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onView(user)}
                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => onEdit(user)}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {totalPages > 1 && (
      <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Showing <span className="font-medium">{fromItem}</span> to{" "}
          <span className="font-medium">{toItem}</span> of{" "}
          <span className="font-medium">{totalItems}</span> results
        </p>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() =>
              onPageChange && onPageChange(Math.max(1, currentPage - 1))
            }
            disabled={currentPage === 1}
            className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => onPageChange && onPageChange(i + 1)}
              className={`px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors ${
                currentPage === i + 1
                  ? "text-white bg-primary"
                  : "text-gray-500 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() =>
              onPageChange &&
              onPageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    )}
    </div>
  );
};

export default UsersTable;
