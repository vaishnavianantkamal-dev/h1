import React from "react";
import { Edit, Trash2, MapPin } from "lucide-react";
import TableSkeleton from "../../../components/TableSkeleton";

const PincodesTable = ({ pincodes, isLoading, onEdit, onDelete }) => {
  if (isLoading) {
    return <TableSkeleton columns={5} rows={5} />;
  }

  if (!pincodes || pincodes.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No pincodes found. Add one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Area
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pincode
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              City
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
          {pincodes.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-6">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="font-medium text-gray-900">{item.area}</span>
                </div>
              </td>
              <td className="py-4 px-6">
                <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                  {item.pincode}
                </span>
              </td>
              <td className="py-4 px-6 text-sm text-gray-600">
                {item.city || "N/A"}
              </td>
              <td className="py-4 px-6">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    item.is_active
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-red-50 text-red-700 border-red-100"
                  }`}
                >
                  {item.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
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
  );
};

export default PincodesTable;
