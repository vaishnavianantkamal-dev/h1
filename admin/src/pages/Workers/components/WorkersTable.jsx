import React from "react";
import {
  Eye,
  Edit,
  Trash2,
  Shield,
  Wallet,
  Star,
  Banknote,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";

const WorkersTable = ({
  workers,
  onEdit,
  onView,
  onDelete,
  onWithdraw,
  onViewBookings,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems = 0,
  fromItem = 0,
  toItem = 0,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Worker Details
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Added By
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Refer By
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                KYC Status
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Services & Skills
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Availability
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Wallet
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workers.map((worker) => {
              // Normalize data from API structure
              const avatar =
                worker.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  worker.name,
                )}&background=random&color=fff`;

              const kycStatusRaw =
                worker.kyc_status ||
                worker.worker?.kyc_status ||
                worker.kycStatus ||
                "Pending";
              const kycStatus =
                kycStatusRaw.charAt(0).toUpperCase() + kycStatusRaw.slice(1);

              const walletBalance =
                worker.wallet_balance ||
                worker.worker?.wallet_balance ||
                worker.walletBalance ||
                0;

              const services = worker.services
                ? worker.services
                : worker.service
                  ? [worker.service]
                  : [];

              const skills = worker.skills
                ? worker.skills
                : worker.worker?.skills
                  ? Array.isArray(worker.worker.skills)
                    ? worker.worker.skills
                    : [worker.worker.skills]
                  : [];

              const availability =
                worker.is_active === 0 || worker.is_active === "0"
                  ? "Unavailable"
                  : worker.is_active === 1 || worker.is_active === "1"
                    ? "Available"
                    : worker.availability ||
                      (worker.worker_availablillity?.length > 0
                        ? "Available"
                        : "Unavailable");

              const displayRating =
                worker.ratings?.average ??
                worker.rating ??
                worker.worker?.rating ??
                "N/A";

              const displayReviews =
                worker.ratings?.count ??
                worker.reviews ??
                worker.worker?.reviews ??
                0;

              return (
                <tr
                  key={worker.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatar}
                        alt={worker.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {worker.name}
                        </p>
                        <p className="text-xs text-gray-500 mb-0.5">
                          {worker.phone}
                        </p>
                        {worker.email && (
                          <p
                            className="text-xs text-gray-400 mb-1 truncate max-w-[150px]"
                            title={worker.email}
                          >
                            {worker.email}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(
                            (Array.isArray(worker.categories)
                              ? worker.categories
                              : Array.isArray(worker.category)
                                ? worker.category
                                : worker.category
                                  ? [worker.category]
                                  : []) || []
                          ).map((cat, idx) => {
                            const catName =
                              typeof cat === "object" && cat !== null
                                ? cat.name
                                : cat;
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border
                              ${
                                catName === "Maid Service"
                                  ? "bg-purple-50 text-purple-700 border-purple-100"
                                  : catName === "Cleaning Service"
                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                    : catName === "Cook"
                                      ? "bg-orange-50 text-orange-700 border-orange-100"
                                      : "bg-pink-50 text-pink-700 border-pink-100"
                              }`}
                              >
                                {catName}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {worker.added_by ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {worker.added_by.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {worker.added_by.public_id}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">System</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {worker.refer_by ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {typeof worker.refer_by === "object"
                            ? worker.refer_by.firm || worker.refer_by.name
                            : worker.refer_by}
                        </p>
                        {typeof worker.refer_by === "object" &&
                          worker.refer_by.referral_code && (
                            <p className="text-xs text-gray-500">
                              {worker.refer_by.referral_code}
                            </p>
                          )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        kycStatus === "Approved"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : kycStatus === "Pending"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                            : "bg-red-50 text-red-700 border-red-100"
                      }`}
                    >
                      <Shield size={12} />
                      {kycStatus}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(() => {
                        const serviceItems = services.map((s) => ({
                          type: "service",
                          label:
                            typeof s === "object" && s !== null ? s.name : s,
                        }));
                        const skillItems = skills.map((s) => ({
                          type: "skill",
                          label: s,
                        }));
                        const allItems = [...serviceItems, ...skillItems];
                        const displayLimit = 2;
                        const displayedItems = allItems.slice(0, displayLimit);
                        const remainingCount = allItems.length - displayLimit;

                        return (
                          <>
                            {displayedItems.map((item, idx) => (
                              <span
                                key={`item-${idx}`}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  item.type === "service"
                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {item.label}
                              </span>
                            ))}
                            {remainingCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500 border border-gray-200">
                                +{remainingCount}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        availability === "Available"
                          ? "text-green-600"
                          : availability === "Busy"
                            ? "text-orange-600"
                            : "text-gray-400"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          availability === "Available"
                            ? "bg-green-500"
                            : availability === "Busy"
                              ? "bg-orange-500"
                              : "bg-gray-400"
                        }`}
                      ></div>
                      {availability}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 font-medium text-gray-900">
                      <Wallet size={14} className="text-gray-400" />₹
                      {Number(walletBalance).toFixed(2)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100">
                        <Star
                          size={12}
                          className="text-yellow-500 fill-yellow-500"
                        />
                        <span className="text-xs font-bold text-yellow-700">
                          {displayRating}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        ({displayReviews})
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 ">
                      <button
                        onClick={() => onViewBookings && onViewBookings(worker)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Bookings History"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => onView && onView(worker)}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onWithdraw && onWithdraw(worker)}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Request Withdrawal"
                      >
                        <Banknote size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(worker)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete && onDelete(worker)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing <span className="font-medium">{fromItem}</span> to{" "}
            <span className="font-medium">{toItem}</span> of{" "}
            <span className="font-medium">{totalItems}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {/* Page Numbers */}
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => onPageChange(i + 1)}
                className={`px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors ${
                  currentPage === i + 1
                    ? "text-white bg-primary"
                    : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersTable;
