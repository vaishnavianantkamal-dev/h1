import React from "react";
import { Edit2, Trash2, CheckCircle, XCircle, Eye } from "lucide-react";
import { getImageUrl } from "../../../utils/imageUrl";

const CategoriesTable = ({
  data,
  filterData,
  onEdit,
  onDelete,
  onViewServices,
}) => {
  const filteredData = filterData ? filterData(data) : data;

  if (filteredData.length === 0) return null;

  return (
    <table className="w-full text-left border-collapse">
      <thead className="bg-gray-50/50 border-b border-gray-100">
        <tr>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Category Name
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Description
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Subscription Types
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Total Services
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Status
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase text-right">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {filteredData.map((item) => (
          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl overflow-hidden">
                  {typeof item.icon === "string" &&
                  (item.icon.startsWith("storage/") ||
                    item.icon.startsWith("/storage/") ||
                    item.icon.startsWith("http")) ? (
                    <img
                      src={getImageUrl(item.icon)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    item.icon || "📦"
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">
                    {item.name}
                  </span>
                </div>
              </div>
            </td>
            <td className="py-4 px-6 text-sm text-gray-600 max-w-xs truncate">
              {item.description}
            </td>
            <td className="py-4 px-6">
              {Array.isArray(item.subscriptions) &&
              item.subscriptions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-w-xs">
                  {item.subscriptions.map((sub) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"
                    >
                      {sub.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </td>
            <td className="py-4 px-6">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                {item.services_count || 0} Services
              </span>
            </td>
            <td className="py-4 px-6">
              {item.status === 1 ||
              item.status === "1" ||
              item.status === "Active" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  <CheckCircle size={12} /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                  <XCircle size={12} /> Inactive
                </span>
              )}
            </td>
            <td className="py-4 px-6 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => onViewServices && onViewServices(item)}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="View services"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => onEdit && onEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete && onDelete(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default CategoriesTable;
