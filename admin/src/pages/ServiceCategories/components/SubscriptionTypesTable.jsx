import React from "react";
import { Edit2, Trash2, Tag } from "lucide-react";

const SubscriptionTypesTable = ({ data, filterData, onEdit, onDelete }) => {
  const filteredData = filterData ? filterData(data) : data;

  if (filteredData.length === 0) return null;

  return (
    <table className="w-full text-left border-collapse">
      <thead className="bg-gray-50/50 border-b border-gray-100">
        <tr>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Name
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Created At
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
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-primary" />
                <span className="font-medium text-gray-900">{item.name}</span>
              </div>
            </td>
            <td className="py-4 px-6 text-sm text-gray-500">
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "-"}
            </td>

            <td className="py-4 px-6 text-right">
              <div className="flex items-center justify-end gap-2">
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

export default SubscriptionTypesTable;
