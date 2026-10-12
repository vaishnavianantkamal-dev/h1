import React from "react";
import { Phone, MapPin, History, Star, Eye, MoreVertical } from "lucide-react";
import TableSkeleton from "../../../components/TableSkeleton";

const CustomersTable = ({
  customers,
  totalCustomers,
  currentPage,
  totalPages,
  customersPerPage,
  startIndex,
  endIndex,
  onViewHistory,
  isLoading,
  onPageChange,
}) => {
  if (isLoading) {
    return <TableSkeleton columns={6} rows={5} />;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Customer Details
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Contact & Address
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Booking History
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Payment Status
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Feedback
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <img
                      src={customer.avatar}
                      alt={customer.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {customer.name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {customer.id}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      <Phone size={14} className="text-gray-400" />
                      {customer.phone}
                      {customer.isWhatsapp && (
                        <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                          WA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={14} className="text-gray-400" />
                      <span
                        className="truncate max-w-[150px]"
                        title={customer.address}
                      >
                        {customer.address}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      <History size={14} className="text-gray-400" />
                      {customer.bookingsCount} Bookings
                    </div>
                    <div className="text-xs text-gray-500">
                      Last: {customer.lastBookingDate}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {(() => {
                    // Show the LAST booking's payment status (matches the
                    // modal header). Falls back to the aggregated one.
                    const rawStatus =
                      customer.lastBookingPaymentStatus ||
                      customer.payment_status ||
                      customer.paymentStatus ||
                      "Pending";
                    const status = rawStatus.toLowerCase();
                    let colorClass = "bg-gray-50 text-gray-700 border-gray-100";

                    if (status === "paid") {
                      colorClass =
                        "bg-green-50 text-green-700 border-green-100";
                    } else if (status === "unpaid" || status === "due") {
                      colorClass = "bg-red-50 text-red-700 border-red-100";
                    } else if (
                      status === "pending" ||
                      status === "payment_pending"
                    ) {
                      colorClass =
                        "bg-yellow-50 text-yellow-700 border-yellow-100";
                    } else if (status === "rejected" || status === "failed") {
                      colorClass = "bg-red-50 text-red-700 border-red-100";
                    }

                    return (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
                      >
                        {status === "payment_pending"
                          ? "Payment Pending"
                          : rawStatus}
                      </span>
                    );
                  })()}
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Star
                        size={14}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      <span className="text-sm font-bold text-gray-900">
                        {customer.rating}
                      </span>
                    </div>
                    <p
                      className="text-xs text-gray-500 italic truncate max-w-[150px]"
                      title={customer.feedback}
                    >
                      "{customer.feedback}"
                    </p>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewHistory(customer)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Booking History"
                    >
                      <Eye size={16} />
                    </button>
                    {/* <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical size={16} />
                    </button> */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500 text-center sm:text-left">
          Showing <span className="font-medium">{startIndex}</span> to{" "}
          <span className="font-medium">{endIndex}</span> of{" "}
          <span className="font-medium">{totalCustomers}</span> results
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {/* Generate page numbers */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
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
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomersTable;
