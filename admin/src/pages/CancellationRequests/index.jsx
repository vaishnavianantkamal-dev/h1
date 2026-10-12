import React, { useState } from "react";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Phone,
  Calendar,
  IndianRupee,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetCancellationRequestsQuery,
  useApproveCancellationRequestMutation,
  useRejectCancellationRequestMutation,
} from "../../api/apiSlice";
import Pagination from "../../components/Pagination";
import TableSkeleton from "../../components/TableSkeleton";
import { formatDateTime12 } from "../../utils/date";

const CancellationRequests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");

  const {
    data: response = { data: [], meta: null },
    isLoading,
    isFetching,
    refetch,
  } = useGetCancellationRequestsQuery({ page: currentPage, per_page: perPage });
  const [approveRequest, { isLoading: approving }] =
    useApproveCancellationRequestMutation();
  const [rejectRequest, { isLoading: rejecting }] =
    useRejectCancellationRequestMutation();

  const requests = response.data || [];
  const meta = response.meta;

  const filteredRequests = requests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      String(r.id).includes(term) ||
      r.customer_name?.toLowerCase().includes(term) ||
      r.customer_phone?.includes(term) ||
      r.service?.name?.toLowerCase().includes(term)
    );
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-100";
      case "cancellation_requested":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "cancelled":
        return <XCircle size={16} className="text-red-600" />;
      case "cancellation_requested":
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const openApproveModal = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const closeApproveModal = () => {
    setShowApproveModal(false);
    setSelectedRequest(null);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await approveRequest(selectedRequest.id).unwrap();
      toast.success("Cancellation approved successfully!");
      closeApproveModal();
      refetch();
    } catch (error) {
      toast.error(error.data?.message || "Failed to approve cancellation");
    }
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setReason("");
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setReason("");
    setSelectedRequest(null);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectRequest({
        id: selectedRequest.id,
        reason: reason.trim(),
      }).unwrap();
      toast.success("Cancellation request rejected");
      closeRejectModal();
      refetch();
    } catch (error) {
      toast.error(error.data?.message || "Failed to reject cancellation");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Cancel Order Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and action booking cancellation requests raised by customers
          </p>
        </div>
        <TableSkeleton columns={6} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Cancel Order Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and action booking cancellation requests raised by customers
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by booking, customer, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm
              ? "No requests found matching your search."
              : "No cancellation requests found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Booking
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Service / Amount
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Reason
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
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">
                        #{request.id}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar size={12} className="text-gray-400" />
                        {request.booking_date} · {request.time_slot}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm">
                        <User size={14} className="text-gray-400" />
                        <span className="text-gray-900">
                          {request.customer_name || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Phone size={12} className="text-gray-400" />
                        {request.customer_phone || "N/A"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {request.service?.name || "N/A"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <IndianRupee size={12} className="text-gray-400" />
                        {request.amount ?? "0.00"}
                        {request.payment_status && (
                          <span className="ml-1 capitalize">
                            ({request.payment_status})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs">
                        {request.cancellation_reason ? (
                          <div className="flex items-start gap-1.5 text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                            <MessageSquare
                              size={13}
                              className="text-gray-400 mt-0.5 shrink-0"
                            />
                            {request.cancellation_reason}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            No reason provided
                          </span>
                        )}
                        {request.cancellation_requested_at && (
                          <div className="text-xs text-gray-400 mt-1">
                            Requested{" "}
                            {formatDateTime12(request.cancellation_requested_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                          request.status,
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        {request.status?.replace(/_/g, " ") || "Unknown"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {request.status === "cancellation_requested" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openApproveModal(request)}
                            disabled={approving || rejecting}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(request)}
                            disabled={approving || rejecting}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.total > 0 && (
        <Pagination
          currentPage={meta.current_page}
          totalPages={meta.last_page}
          onPageChange={setCurrentPage}
          fromItem={(meta.current_page - 1) * meta.per_page + 1}
          toItem={Math.min(meta.current_page * meta.per_page, meta.total)}
          totalItems={meta.total}
          perPage={perPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setCurrentPage(1);
          }}
          perPageOptions={[15, 25, 50, 100]}
        />
      )}

      {isFetching && !isLoading && (
        <p className="text-xs text-gray-400 text-center">Refreshing…</p>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Approve Cancellation Request
                </h3>
                <p className="text-sm text-gray-600">
                  Booking #{selectedRequest.id} · {selectedRequest.customer_name}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This will cancel the booking and process a refund to the
              customer, if applicable. This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeApproveModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Reject Cancellation Request
                </h3>
                <p className="text-sm text-gray-600">
                  Booking #{selectedRequest.id} · {selectedRequest.customer_name}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm resize-none"
                placeholder="Enter reason for rejecting this cancellation request..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? "Rejecting..." : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationRequests;
