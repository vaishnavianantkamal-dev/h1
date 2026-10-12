import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Calendar,
  UserCheck,
  UserX,
  Clock,
  CreditCard,
  Users,
  FileText,
  X,
  Download,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { useGetContractorDetailsQuery } from "../../api/apiSlice";
import TableSkeleton from "../../components/TableSkeleton";
import { getImageUrl } from "../../utils/imageUrl";

const ContractorWorkers = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [previewWorker, setPreviewWorker] = useState(null);

  const { data: detailsData, isLoading } = useGetContractorDetailsQuery(id);

  const contractor = detailsData?.contractor;
  const workers = detailsData?.workers || [];

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <TableSkeleton columns={4} rows={10} />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="p-4 md:p-6 text-center py-20">
        <h3 className="text-lg font-medium text-gray-900">
          Contractor not found
        </h3>
        <button
          onClick={() => navigate("/contractors")}
          className="mt-4 text-primary hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Back to Contractors
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/contractors")}
          className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {contractor.name} - Workers
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            View all workers associated with this contractor
          </p>
        </div>
      </div>

      {/* Contractor Info Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {contractor.name}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2 font-mono bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
              <CreditCard size={14} className="text-gray-400" />
              <span>ID: {contractor.public_id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              <span>{contractor.phone || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gray-400" />
              <span>{contractor.email || "N/A"}</span>
            </div>
            {contractor.city && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" />
                <span>{contractor.city}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center px-6 py-3 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm min-w-[120px]">
            <span className="text-2xl font-bold text-primary">
              {contractor.workers_count || 0}
            </span>
            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">
              Total Workers
            </span>
          </div>
        </div>
      </div>

      {/* Workers Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Associated Workers ({workers.length})
          </h4>
        </div>

        {workers.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Worker Info
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                      Documents
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      KYC Status
                    </th>
                    {/* <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined Date
                    </th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workers.map((worker) => (
                    <tr
                      key={worker.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() =>
                              navigate("/workers", {
                                state: { search: worker.public_id },
                              })
                            }
                            className="font-bold text-gray-900 hover:text-primary transition-colors text-left group-hover:underline decoration-primary/30 underline-offset-4"
                          >
                            {worker.name}
                          </button>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {worker.public_id}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} className="text-gray-400" />
                          <span>{worker.phone || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin
                            size={14}
                            className="text-gray-400 flex-shrink-0"
                          />
                          <span className="truncate max-w-[200px]">
                            {[
                              worker.area?.name,
                              worker.zone?.name,
                              worker.city?.name,
                            ]
                              .filter(Boolean)
                              .join(", ") || "No location set"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {worker.worker?.id_front_path?.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPreviewWorker(worker)}
                            className="text-sm font-bold text-primary hover:text-primary/80 transition-all underline underline-offset-4 decoration-primary/30"
                          >
                            View Documents
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">
                            No Documents
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {worker.worker?.kyc_status === "approved" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-tight">
                            <UserCheck size={12} />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-100 uppercase tracking-tight">
                            <Clock size={12} />
                            {worker.worker?.kyc_status || "Pending"}
                          </span>
                        )}
                      </td>
                      {/* <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar size={14} className="text-gray-300" />
                          <span>
                            {worker.created_at
                              ? format(
                                new Date(worker.created_at),
                                "MMM dd, yyyy",
                              )
                              : "N/A"}
                          </span>
                        </div>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-gray-200 rounded-3xl bg-white shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserX size={32} className="text-gray-300" />
            </div>
            <h5 className="text-gray-900 font-bold text-lg">
              No workers assigned
            </h5>
            <p className="text-gray-500 mt-2 max-w-xs mx-auto">
              This contractor currently has no associated workers in the system.
            </p>
          </div>
        )}
      </div>

      {/* Worker Documents Preview Modal */}
      {previewWorker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="relative max-w-5xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText size={18} />
                </div>
                <h3 className="font-bold text-gray-900 uppercase tracking-wide">
                  Worker Documents: {previewWorker.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewWorker(null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Documents List Body */}
            <div className="p-6 bg-gray-50 overflow-y-auto flex-1">
              <div className="space-y-8">
                {previewWorker.worker?.id_type?.map((type, idx) => {
                  const frontImg = previewWorker.worker.id_front_path?.[idx];
                  const backImg = previewWorker.worker.id_back_path?.[idx];

                  return (
                    <div key={idx} className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                        <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase">
                          {type}
                        </span>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                          Identification Set #{idx + 1}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Front Image */}
                        {frontImg && (
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                              Front Side
                            </p>
                            <div className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                              <img
                                src={getImageUrl(frontImg)}
                                alt={`${type} Front`}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <a
                                  href={getImageUrl(frontImg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-primary rounded-lg shadow-sm transition-all"
                                  title="View Full Size"
                                >
                                  <Eye size={16} />
                                </a>
                                <a
                                  href={getImageUrl(frontImg)}
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
                          </div>
                        )}

                        {/* Back Image */}
                        {backImg && (
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                              Back Side
                            </p>
                            <div className="relative group aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                              <img
                                src={getImageUrl(backImg)}
                                alt={`${type} Back`}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <a
                                  href={getImageUrl(backImg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-primary rounded-lg shadow-sm transition-all"
                                  title="View Full Size"
                                >
                                  <Eye size={16} />
                                </a>
                                <a
                                  href={getImageUrl(backImg)}
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
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-white sticky bottom-0 z-10">
              <button
                onClick={() => setPreviewWorker(null)}
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

export default ContractorWorkers;
