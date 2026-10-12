import React, { useEffect, useState } from "react";
import {
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Clock,
  MoreVertical,
  RefreshCcw,
  X,
} from "lucide-react";
import StatsGrid from "../../components/StatsGrid";
import FilterBar from "../../components/FilterBar";
import CityFilter from "../../components/CityFilter";
import TableSkeleton from "../../components/TableSkeleton";
import {
  useGetTransactionsQuery,
  useExportTransactionsReportMutation,
} from "../../api/apiSlice";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [singleDate, setSingleDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [cityId, setCityId] = useState("");

  const formatDateForApi = (value) => {
    if (!value) return "";
    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return "";
    return `${day}-${month}-${year}`;
  };

  const formattedSingleDate = formatDateForApi(singleDate);
  const formattedFromDate = formatDateForApi(fromDate);
  const formattedToDate = formatDateForApi(toDate);

  const transactionQueryParams = {
    page: currentPage,
    ...(formattedSingleDate ? { date: formattedSingleDate } : {}),
    ...(!formattedSingleDate && formattedFromDate
      ? { from: formattedFromDate }
      : {}),
    ...(!formattedSingleDate && formattedToDate ? { to: formattedToDate } : {}),
    ...(cityId ? { city_id: cityId } : {}),
  };

  const { data: transactionsResponse, isLoading } =
    useGetTransactionsQuery(transactionQueryParams);

  const [
    exportTransactionsReport,
    { isLoading: isExporting, reset: resetExportMutation },
  ] = useExportTransactionsReportMutation();

  useEffect(() => {
    setCurrentPage(1);
  }, [singleDate, fromDate, toDate, typeFilter, searchTerm, cityId]);

  const transactionsData = transactionsResponse?.data || [];
  const paginationMeta = transactionsResponse?.meta || {};
  const summaryData = transactionsResponse?.summary || {};

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all financial transactions
            </p>
          </div>
        </div>
        <TableSkeleton columns={6} />
      </div>
    );
  }

  // Normalize transactions data
  const transactions = transactionsData.map((t) => ({
    id: t.payment_id,
    userId: t.user_id ? `U-${t.user_id}` : "Guest",
    userName: t.user_name || "Unknown",
    userPhone: t.mobile,
    type: t.status === "refunded" ? "Refund" : "Payment",
    description:
      t.payment_type === "upi" ? `UPI Payment (${t.mobile})` : "Transaction",
    amount: parseFloat(t.amount),
    direction: t.status === "refunded" ? "Debit" : "Credit",
    status: t.status,
    date: t.paid_at ? t.paid_at.split(" ")[0] : "N/A",
    time: t.paid_at ? t.paid_at.split(" ")[1] : "N/A",
    original: t,
  }));

  // Apply client-side filtering (for search and type filter)
  const filteredTransactions = transactions.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "All" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "captured":
      case "Success":
        return "bg-green-50 text-green-700 border-green-100";
      case "refunded":
      case "Refunded":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "failed":
      case "Failed":
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const statsData = [
    {
      label: "Total Transactions",
      value: summaryData.total_transactions || 0,
    },
    {
      label: "Total Income",
      value: `₹ ${(summaryData.total_income || 0).toLocaleString()}`,
      colorClass: "text-green-600",
    },
    {
      label: "Total Refunds",
      value: `₹ ${(summaryData.total_refunds || 0).toLocaleString()}`,
      colorClass: "text-red-600",
    },
    {
      label: "Net Balance",
      value: `₹ ${(summaryData.net_balance || 0).toLocaleString()}`,
      colorClass: "text-primary",
    },
  ];

  const transactionTypes = ["All", "Payment", "Refund"];

  const filterTabs = transactionTypes.map((type) => ({
    id: type,
    label: type,
  }));

  const readJsonFromBlob = async (blob) => {
    try {
      const text = await blob.text();
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  };

  const handleExportReport = async () => {
    try {
      const statusForExport =
        typeFilter === "Payment"
          ? "captured"
          : typeFilter === "Refund"
            ? "refunded"
            : "";

      // Export API expects yyyy-mm-dd, so raw date input values are used as-is
      const params = {
        format: "excel",
        from: singleDate || fromDate || "",
        to: singleDate || toDate || "",
        status: statusForExport,
        city_id: cityId || "",
      };

      const blob = await exportTransactionsReport(params).unwrap();

      // API sometimes returns 200 with a JSON error body (e.g. "No transactions found")
      if (blob?.type && blob.type.includes("application/json")) {
        const json = await readJsonFromBlob(blob);
        toast.error(
          json?.message || "No transactions found for the selected filters.",
        );
        return;
      }

      const statusSuffix = params.status ? `_${params.status}` : "";
      const dateSuffix =
        params.from && params.to
          ? `_${params.from}_to_${params.to}`
          : params.from
            ? `_${params.from}`
            : params.to
              ? `_${params.to}`
              : "";

      saveAs(
        blob,
        `transactions_report${statusSuffix}${dateSuffix}_${format(
          new Date(),
          "yyyyMMdd_HHmmss",
        )}.xlsx`,
      );
    } catch (error) {
      console.error("Failed to export report:", error);
      let message = "Failed to export report";
      if (error?.data instanceof Blob) {
        const json = await readJsonFromBlob(error.data);
        if (json?.message) message = json.message;
      } else if (error?.data?.message) {
        message = error.data.message;
      }
      toast.error(message);
    } finally {
      // Drop the Blob from RTK Query's cache so the serializability check is happy
      resetExportMutation();
    }
  };

  const clearDateFilters = () => {
    setSingleDate("");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all financial transactions
          </p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <RefreshCcw size={20} className="animate-spin" />
          ) : (
            <Download size={20} />
          )}
          <span className="font-medium">
            {isExporting ? "Exporting..." : "Export Report"}
          </span>
        </button>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={statsData} />

      {/* Filter Bar */}
      <FilterBar
        tabs={filterTabs}
        activeTab={typeFilter}
        onTabChange={setTypeFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search ID, user or description..."
        rightSlot={<CityFilter value={cityId} onChange={setCityId} />}
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Single Date
            </label>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => {
                setSingleDate(e.target.value);
                if (e.target.value) {
                  setFromDate("");
                  setToDate("");
                }
              }}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                if (e.target.value) {
                  setSingleDate("");
                }
              }}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              To
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                if (e.target.value) {
                  setSingleDate("");
                }
              }}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2 outline-none"
            />
          </div>
          {(singleDate || fromDate || toDate) && (
            <button
              onClick={clearDateFilters}
              className="inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium rounded-lg text-sm px-4 py-2.5 transition-colors"
            >
              <X size={16} />
              Clear Dates
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          API format: single date as <code>dd-mm-yyyy</code>, range as{" "}
          <code>from</code> and <code>to</code>.
        </p>
      </div>

      {/* Transactions Table - Desktop View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type / Description
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {/* <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Actions
                </th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((item) => (
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
                        {item.userName}
                      </div>
                      <div className="text-xs text-gray-500">{item.userId}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.type}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {item.description}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div
                      className={`flex items-center gap-1.5 font-semibold ${item.direction === "Credit"
                          ? "text-green-600"
                          : "text-gray-900"
                        }`}
                    >
                      {item.direction === "Credit" ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} className="text-gray-400" />
                      )}
                      ₹{item.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock size={14} />
                      <span className="text-sm">
                        {item.date} • {item.time}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {/* <button className="text-gray-400 hover:text-primary transition-colors">
                      <MoreVertical size={18} />
                    </button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No transactions found matching your criteria.
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredTransactions.map((item) => (
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
                  item.status,
                )}`}
              >
                {item.status}
              </span>
            </div>

            <div className="flex items-center gap-3 py-3 border-t border-b border-gray-50">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <span className="font-medium text-sm">
                  {item.userName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.userName}
                </p>
                <p className="text-xs text-gray-500">{item.userId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <div
                  className={`flex items-center gap-1.5 font-semibold text-sm ${item.direction === "Credit"
                      ? "text-green-600"
                      : "text-gray-900"
                    }`}
                >
                  {item.direction === "Credit" ? (
                    <ArrowDownLeft size={14} />
                  ) : (
                    <ArrowUpRight size={14} className="text-gray-400" />
                  )}
                  ₹{item.amount.toLocaleString()}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Type</p>
                <p className="text-sm text-gray-900">{item.type}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>

            <button className="w-full py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors mt-2">
              View Receipt
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500 text-center sm:text-left">
          Showing <span className="font-medium">{paginationMeta.from || 0}</span> to{" "}
          <span className="font-medium">{paginationMeta.to || 0}</span> of{" "}
          <span className="font-medium">{summaryData.total_transactions || 0}</span> results
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!paginationMeta.has_more && currentPage <= 1}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {/* Generate page numbers */}
          {Array.from({ length: Math.min(paginationMeta.last_page || 1, 5) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${currentPage === pageNum
                    ? "text-white bg-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={!paginationMeta.has_more}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
