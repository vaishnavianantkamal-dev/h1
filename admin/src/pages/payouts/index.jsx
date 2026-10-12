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

const Payouts = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    workerId: "",
    workerName: "",
    amount: "",
    method: "Bank Transfer",
    accountNumber: "",
    transactionRef: "",
    status: "Processing",
  });

  // Mock Data
  const [payouts, setPayouts] = useState([
    {
      id: "PAY-3001",
      workerId: "W-102",
      workerName: "Michael Chen",
      amount: 2500.0,
      method: "Bank Transfer",
      accountNumber: "**** 4521",
      transactionRef: "UTR-88219932",
      date: "2024-02-20",
      time: "10:30 AM",
      status: "Paid",
    },
    {
      id: "PAY-3002",
      workerId: "W-089",
      workerName: "Emily Davis",
      amount: 1200.0,
      method: "UPI",
      accountNumber: "emily@okhdfc",
      transactionRef: "UPI-77219932",
      date: "2024-02-19",
      time: "02:15 PM",
      status: "Paid",
    },
    {
      id: "PAY-3003",
      workerId: "W-101",
      workerName: "Sarah Johnson",
      amount: 5000.0,
      method: "Bank Transfer",
      accountNumber: "**** 8821",
      transactionRef: "",
      date: "2024-02-19",
      time: "09:00 AM",
      status: "Failed",
      reason: "Bank server down",
    },
    {
      id: "PAY-3004",
      workerId: "W-045",
      workerName: "Jessica Taylor",
      amount: 850.0,
      method: "UPI",
      accountNumber: "jessica@paytm",
      transactionRef: "",
      date: "2024-02-18",
      time: "04:45 PM",
      status: "Processing",
    },
  ]);

  const statuses = ["All", "Paid", "Processing", "Failed"];

  const filteredPayouts = payouts.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.workerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700 border-green-200";
      case "Processing":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Failed":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const statsData = [
    {
      label: "Total Payouts",
      value: payouts.length,
    },
    {
      label: "Paid Amount",
      value: `₹ ${payouts
        .filter((p) => p.status === "Paid")
        .reduce((acc, curr) => acc + curr.amount, 0)
        .toLocaleString()}`,
      colorClass: "text-green-600",
    },
    {
      label: "Processing",
      value: payouts.filter((p) => p.status === "Processing").length,
      colorClass: "text-yellow-600",
    },
    {
      label: "Failed",
      value: payouts.filter((p) => p.status === "Failed").length,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const newPayout = {
      id: `PAY-${Math.floor(3000 + Math.random() * 7000)}`,
      ...formData,
      amount: parseFloat(formData.amount),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setPayouts([newPayout, ...payouts]);
    setIsModalOpen(false);
    setFormData({
      workerId: "",
      workerName: "",
      amount: "",
      method: "Bank Transfer",
      accountNumber: "",
      transactionRef: "",
      status: "Processing",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage worker payouts
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={20} />
            <span>Add Payout</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
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

      {/* Payouts Table - Desktop View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Payout ID
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-4 px-6 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayouts.map((item) => (
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
                        {item.workerName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.workerId}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-gray-900">
                      ₹{item.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {item.method === "Bank Transfer" ? (
                        <Building2 size={16} className="text-gray-400" />
                      ) : (
                        <CreditCard size={16} className="text-gray-400" />
                      )}
                      <div>
                        <div className="text-sm text-gray-900">
                          {item.method}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.accountNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock size={16} />
                      <div className="text-sm">
                        <div>{item.date}</div>
                        <div className="text-xs">{item.time}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-gray-400 hover:text-primary transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPayouts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payouts found matching your criteria.
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredPayouts.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {item.id}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{item.date}</p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                  item.status
                )}`}
              >
                {item.status}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-b border-gray-50">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Worker</p>
                <p className="text-sm font-medium text-gray-900">
                  {item.workerName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                <p className="text-lg font-bold text-gray-900">
                  ₹{item.amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                {item.method === "Bank Transfer" ? (
                  <Building2 size={16} />
                ) : (
                  <CreditCard size={16} />
                )}
                <span>{item.method}</span>
              </div>
              {item.transactionRef && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                  Ref: {item.transactionRef}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500 text-center sm:text-left">
          Showing <span className="font-medium">1</span> to{" "}
          <span className="font-medium">{filteredPayouts.length}</span> of{" "}
          <span className="font-medium">{payouts.length}</span> results
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
            Previous
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg shadow-sm">
            1
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
            Next
          </button>
        </div>
      </div>

      {/* Add Payout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                Add New Payout
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Worker Name
                </label>
                <input
                  type="text"
                  name="workerName"
                  value={formData.workerName}
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
                    name="workerId"
                    value={formData.workerId}
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
                    <option value="Cash">Cash</option>
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
                    <option value="Processing">Processing</option>
                    <option value="Paid">Paid</option>
                    <option value="Failed">Failed</option>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Ref (Optional)
                </label>
                <input
                  type="text"
                  name="transactionRef"
                  value={formData.transactionRef}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="e.g. UTR number"
                />
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Add Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payouts;
