import React, { useState } from "react";
import {
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  CreditCard,
  Building2,
  MoreVertical,
  Plus,
} from "lucide-react";
import StatsGrid from "../../components/StatsGrid";
import FilterBar from "../../components/FilterBar";
import Modal from "../../components/Modal";
import TableSkeleton from "../../components/TableSkeleton";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  useGetWithdrawalsQuery,
  useApproveWithdrawalMutation,
  useRejectWithdrawalMutation,
} from "../../api/apiSlice";

const Withdrawal = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    userId: "",
    userName: "",
    userType: "Worker",
    amount: "",
    method: "Bank Transfer",
    accountNumber: "",
    status: "Pending",
  });

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // "approve" or "reject"
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [actionFormData, setActionFormData] = useState({
    approved_amount: "",
    admin_note: "",
  });

  const {
    data: withdrawalData,
    isLoading,
    isError,
  } = useGetWithdrawalsQuery({ page: currentPage });

  const [approveWithdrawal] = useApproveWithdrawalMutation();
  const [rejectWithdrawal] = useRejectWithdrawalMutation();

  const withdrawals = withdrawalData?.data || [];
  const meta = withdrawalData || {};

  const statuses = ["All", "Pending", "Approved", "Rejected"];

  // Filter logic (client-side filtering for search/status on the current page)
  const filteredWithdrawals = withdrawals.filter((item) => {
    const matchesSearch =
      item.id?.toString().includes(searchTerm) ||
      item.worker_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      item.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "approved":
        return "bg-green-50 text-green-700 border-green-100";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  // Stats - Using available data or placeholders
  // Note: Total stats might not be accurate if we only have one page of data
  // Using meta.total for total requests if available
  const statsData = [
    {
      label: "Total Requests",
      value: meta.total || withdrawals.length,
    },
    {
      label: "Pending Requests",
      value: withdrawals.filter((w) => w.status === "pending").length, // On current page
      colorClass: "text-yellow-600",
    },
    {
      label: "Approved Requests",
      value: withdrawals.filter((w) => w.status === "approved").length, // On current page
      colorClass: "text-green-600",
    },
    {
      label: "Rejected Requests",
      value: withdrawals.filter((w) => w.status === "rejected").length, // On current page
      colorClass: "text-red-600",
    },
  ];

  const filterTabs = statuses.map((status) => ({
    id: status,
    label: status,
  }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleApproveClick = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setActionType("approve");
    setActionFormData({
      approved_amount: withdrawal.requested_amount,
      admin_note: "",
    });
    setIsActionModalOpen(true);
  };

  const handleRejectClick = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setActionType("reject");
    setActionFormData({
      approved_amount: "",
      admin_note: "",
    });
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWithdrawal) return;

    try {
      if (actionType === "approve") {
        await approveWithdrawal({
          id: selectedWithdrawal.id,
          approved_amount: Number(actionFormData.approved_amount),
          admin_note: actionFormData.admin_note,
        }).unwrap();
        toast.success("Withdrawal approved successfully");
      } else if (actionType === "reject") {
        await rejectWithdrawal({
          id: selectedWithdrawal.id,
          admin_note: actionFormData.admin_note,
        }).unwrap();
        toast.success("Withdrawal rejected successfully");
      }
      setIsActionModalOpen(false);
      setSelectedWithdrawal(null);
      setActionType(null);
    } catch (error) {
      console.error(`Failed to ${actionType} withdrawal:`, error);
      toast.error(error?.data?.message || `Failed to ${actionType} withdrawal`);
    }
  };

  // This might need to be connected to an API mutation later
  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder for mutation
    toast.success("Request added (Simulation)");
    setIsModalOpen(false);
    setFormData({
      userId: "",
      userName: "",
      userType: "Worker",
      amount: "",
      method: "Bank Transfer",
      accountNumber: "",
      status: "Pending",
    });
  };

  const handleExportReport = () => {
    if (!filteredWithdrawals || filteredWithdrawals.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = filteredWithdrawals.map((w) => ({
      "Request ID": w.id,
      "Worker Name": w.worker_name,
      "Worker Phone": w.worker_phone,
      Amount: `₹${parseFloat(w.requested_amount).toLocaleString("en-IN")}`,
      "Approved Amount": w.approved_amount
        ? `₹${parseFloat(w.approved_amount).toLocaleString("en-IN")}`
        : "-",
      Note: w.request_note,
      "Admin Note": w.admin_note,
      Date: new Date(w.created_at).toLocaleDateString(),
      Time: new Date(w.created_at).toLocaleTimeString(),
      Status: w.status,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Withdrawals");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(
      data,
      `withdrawals_report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`,
    );
    toast.success("Report exported successfully");
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (meta.last_page || 1)) {
      setCurrentPage(newPage);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Withdrawal Requests
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage worker payout requests and status
            </p>
          </div>
        </div>
        <TableSkeleton columns={7} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-red-500">
        Error loading withdrawals. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Withdrawal Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage worker payout requests and status
          </p>
        </div>
        <div className="flex gap-3">
          {/* <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={20} />
            <span>Add Request</span>
          </button> */}
          <button
            onClick={handleExportReport}
            className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={20} />
            <span className="font-medium">Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={statsData} />

      {/* Filter Bar */}
      <FilterBar
        tabs={filterTabs}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search ID or worker name..."
      />

      {/* Withdrawals Table - Desktop View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Request ID
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Time
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
              {filteredWithdrawals.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-900">{item.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.worker_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.worker_phone}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-gray-900">
                      ₹{parseFloat(item.requested_amount).toLocaleString()}
                    </span>
                    {item.approved_amount &&
                      item.approved_amount !== item.requested_amount && (
                        <div className="text-xs text-gray-500 mt-1">
                          Approved: ₹
                          {parseFloat(item.approved_amount).toLocaleString()}
                        </div>
                      )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm text-gray-900">
                        {item.request_note || "-"}
                      </div>
                      {item.admin_note && (
                        <div className="text-xs text-gray-500">
                          Admin: {item.admin_note}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock size={14} />
                      <span className="text-sm">
                        {new Date(item.created_at).toLocaleDateString()} •{" "}
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        item.status,
                      )} uppercase`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {item.status?.toLowerCase() === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproveClick(item)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={() => handleRejectClick(item)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <button className="text-gray-400 hover:text-primary transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredWithdrawals.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No withdrawal requests found matching your criteria.
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredWithdrawals.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  #{item.id}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                  item.status,
                )} uppercase`}
              >
                {item.status}
              </span>
            </div>

            <div className="flex items-center gap-3 py-3 border-t border-b border-gray-50">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <span className="font-medium text-sm">
                  {item.worker_name?.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.worker_name}
                </p>
                <p className="text-xs text-gray-500">{item.worker_phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(item.requested_amount).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Note</p>
                <p className="text-sm text-gray-900">
                  {item.request_note || "-"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="flex-1 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                View Details
              </button>
              {item.status?.toLowerCase() === "pending" && (
                <>
                  <button
                    onClick={() => handleApproveClick(item)}
                    className="flex-1 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectClick(item)}
                    className="flex-1 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500 text-center sm:text-left">
          Showing{" "}
          <span className="font-medium">
            {(meta.current_page - 1) * meta.per_page + 1 || 0}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(meta.current_page * meta.per_page, meta.total || 0)}
          </span>{" "}
          of <span className="font-medium">{meta.total || 0}</span> results
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!meta.prev_page_url}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          {[...Array(meta.last_page || 1)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => handlePageChange(i + 1)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg shadow-sm ${
                currentPage === i + 1
                  ? "text-white bg-primary"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!meta.next_page_url}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Add Withdrawal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Request"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Worker Name
            </label>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="Enter worker name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Worker ID
              </label>
              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="e.g. W-102"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account / UPI Details
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="e.g. **** 1234 or user@upi"
              required
            />
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Add Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Action Modal (Approve/Reject) */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => {
          setIsActionModalOpen(false);
          setSelectedWithdrawal(null);
        }}
        title={
          actionType === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"
        }
        size="sm"
      >
        <form onSubmit={handleActionSubmit} className="space-y-4">
          {actionType === "approve" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approved Amount (₹)
              </label>
              <input
                type="number"
                value={actionFormData.approved_amount}
                onChange={(e) =>
                  setActionFormData({
                    ...actionFormData,
                    approved_amount: e.target.value,
                  })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="Enter approved amount"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Note
            </label>
            <textarea
              value={actionFormData.admin_note}
              onChange={(e) =>
                setActionFormData({
                  ...actionFormData,
                  admin_note: e.target.value,
                })
              }
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="Enter note for worker"
              rows={3}
              required
            />
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => {
                setIsActionModalOpen(false);
                setSelectedWithdrawal(null);
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex-1 px-4 py-2 text-white rounded-xl transition-colors font-medium ${
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {actionType === "approve" ? "Confirm Approve" : "Confirm Reject"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Withdrawal;
