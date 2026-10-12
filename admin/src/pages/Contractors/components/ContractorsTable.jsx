import React, { useState } from "react";
import {
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  UserX,
  FileText,
  X,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { getImageUrl } from "../../../utils/imageUrl";

const ContractorsTable = ({ data, onViewWorkers, searchTerm }) => {
  const [previewContractor, setPreviewContractor] = useState(null);

  const filteredData = data.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.public_id?.toLowerCase().includes(searchLower) ||
      item.phone?.toLowerCase().includes(searchLower) ||
      item.email?.toLowerCase().includes(searchLower)
    );
  });

  if (filteredData.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search size={24} className="text-gray-400" />
        </div>
        <h3 className="text-gray-900 font-medium">No contractors found</h3>
        <p className="text-gray-500 text-sm mt-1">
          Try adjusting your search terms
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Contractor Info
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Contact Details
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
              Documents
            </th>
            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
              Workers
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
          {filteredData.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-4 px-6">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-500 font-mono mt-0.5">
                    {item.public_id}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                    <Calendar size={10} />
                    <span>
                      Joined{" "}
                      {item.created_at
                        ? format(new Date(item.created_at), "MMM dd, yyyy")
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    <span>{item.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    <span className="truncate max-w-[180px]">
                      {item.email || "N/A"}
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-6 text-center">
                {item.images && item.images.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPreviewContractor(item)}
                    className="text-sm font-bold text-primary hover:text-primary/80 transition-all underline underline-offset-4 decoration-primary/30"
                  >
                    View Documents
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">No Documents</span>
                )}
              </td>
              <td className="py-4 px-6 text-center">
                <div className="inline-flex flex-col items-center">
                  <span className="text-lg font-bold text-primary">
                    {item.workers_count || 0}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Workers
                  </span>
                </div>
              </td>
              <td className="py-4 px-6">
                {item.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                    <UserCheck size={12} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    <UserX size={12} />
                    Inactive
                  </span>
                )}
              </td>
              <td className="py-4 px-6 text-right">
                <button
                  onClick={() => onViewWorkers(item)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                >
                  <Eye size={16} />
                  View Workers
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Documents Preview Modal */}
      {previewContractor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="relative max-w-5xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText size={18} />
                </div>
                <h3 className="font-bold text-gray-900 uppercase tracking-wide">
                  Documents: {previewContractor.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewContractor(null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Documents List Body */}
            <div className="p-6 bg-gray-50 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {previewContractor.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
                  >
                    <div className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                      <img
                        src={getImageUrl(img.path)}
                        alt={img.type}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <a
                          href={getImageUrl(img.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-primary rounded-lg shadow-sm transition-all"
                          title="View Full Size"
                        >
                          <Eye size={16} />
                        </a>
                        <a
                          href={getImageUrl(img.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-primary rounded-lg shadow-sm transition-all"
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        {img.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-white sticky bottom-0 z-10">
              <button
                onClick={() => setPreviewContractor(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractorsTable;
