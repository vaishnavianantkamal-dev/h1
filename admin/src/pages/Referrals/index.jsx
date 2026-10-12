import React, { useState } from "react";
import {
  Download,
  Search,
  Users,
  Gift,
  CheckCircle,
  Clock,
  MoreVertical,
  UserPlus,
  Trophy,
} from "lucide-react";
import StatsGrid from "../../components/StatsGrid";
import FilterBar from "../../components/FilterBar";
import TableSkeleton from "../../components/TableSkeleton";
import { useGetReferralsQuery } from "../../api/apiSlice";

const Referrals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [expandedReferrerId, setExpandedReferrerId] = useState(null);

  const {
    data: referralData,
    isLoading,
    isError,
  } = useGetReferralsQuery({
    page,
  });

  const referrals = referralData?.data || [];
  const meta = referralData?.meta || {};

  const statuses = ["All", "Completed", "Pending", "Expired"];

  const filteredReferrals = referrals.filter((item) => {
    const lower = searchTerm.toLowerCase();
    const matchesSearch =
      item.referrer.name?.toLowerCase().includes(lower) ||
      item.referrer.id?.toString().toLowerCase().includes(lower) ||
      item.referrals.some((r) =>
        (r.user?.name || "").toLowerCase().includes(lower),
      );
    const matchesStatus =
      statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (meta.last_page || 1)) {
      setPage(newPage);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-50 text-green-700 border-green-100";
      case "Pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "Expired":
        return "bg-gray-50 text-gray-700 border-gray-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  const statsData = [
    {
      label: "Total Referrers",
      value: meta.total || 0,
      icon: Users,
    },
    {
      label: "Successful",
      value: referrals.filter((r) => r.status === "Completed").length,
      colorClass: "text-green-600",
      icon: CheckCircle,
    },
    {
      label: "Pending",
      value: referrals.filter((r) => r.status === "Pending").length,
      colorClass: "text-yellow-600",
      icon: Clock,
    },
    {
      label: "Points Distributed",
      value: referrals
        .reduce((acc, curr) => acc + (curr.totalPoints || 0), 0)
        .toLocaleString(),
      colorClass: "text-primary",
      icon: Trophy,
    },
  ];

  const filterTabs = statuses.map((status) => ({
    id: status,
    label: status,
  }));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track user referrals and reward distribution
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
          <Download size={20} />
          <span className="font-medium">Export Report</span>
        </button>
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
        searchPlaceholder="Search by referrer or referee..."
      />

      {/* Referrals Table - Desktop View */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Referrer (From)
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Referrals
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Points / Reward
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReferrals.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {item.referrer.avatar ? (
                          <img
                            src={item.referrer.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs">
                            {item.referrer.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.referrer.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.referrer.id} • {item.referrer.type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {item.referralCount} referral
                        {item.referralCount === 1 ? "" : "s"}
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
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <Gift size={16} className="text-primary" />
                        <div>
                          <span className="font-semibold text-gray-900">
                            {item.totalPoints} pts
                          </span>
                          <div className="text-xs text-gray-500">
                            Wallet Credit
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-500">{item.date}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() =>
                          setExpandedReferrerId(
                            expandedReferrerId === item.id ? null : item.id,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={14} />
                        {expandedReferrerId === item.id
                          ? "Hide Referrals"
                          : "View Referrals"}
                      </button>
                    </td>
                  </tr>
                  {expandedReferrerId === item.id && (
                    <tr>
                      <td
                        colSpan={6}
                        className="bg-gray-50/60 px-6 py-4 text-sm text-gray-700"
                      >
                        {item.referrals.length === 0 ? (
                          <div className="text-gray-500 text-sm">
                            No referred users yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-gray-900">
                                Referred Users
                              </div>
                              <div className="text-xs text-gray-500">
                                Total Points:{" "}
                                <span className="font-semibold text-primary">
                                  {item.totalPoints}
                                </span>
                              </div>
                            </div>
                            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden bg-white">
                              {item.referrals.map((ref) => (
                                <div
                                  key={ref.id}
                                  className="flex items-center justify-between px-3 py-2 text-xs"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {ref.user.name}
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                      {ref.user.id} • {ref.type}
                                    </div>
                                  </div>
                                  <div className="text-right space-y-0.5">
                                    <div className="text-[11px] text-gray-500">
                                      {ref.createdAt?.split("T")[0] || ""}
                                    </div>
                                    <div className="text-[11px] font-semibold text-primary">
                                      +{ref.points} pts
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            Loading referrals...
          </div>
        ) : (
          filteredReferrals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No referrals found matching your criteria.
            </div>
          )
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredReferrals.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-900">
                {item.referrer.name}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                  item.status,
                )}`}
              >
                {item.status}
              </span>
            </div>

            {/* Referrer */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <UserPlus size={14} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Referrer</p>
                  <p className="text-sm font-medium text-gray-900">
                  {item.referrer.name}
                  </p>
                </div>
              </div>

              {/* Referee */}
              <div className="flex items-center gap-3 pl-4 border-l-2 border-gray-100 ml-4">
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-50 text-purple-600">
                  <span className="text-xs font-bold">
                  {item.referrer.name.charAt(0)}
                  </span>
                </div>
                <div>
                <p className="text-xs text-gray-500">Total Referrals</p>
                  <p className="text-sm font-medium text-gray-900">
                  {item.referralCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-500 mb-1">Reward</p>
                <div className="flex items-center gap-1.5">
                  <Gift size={14} className="text-primary" />
                  <span className="text-sm font-semibold text-gray-900">
                    {item.totalPoints} pts
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="text-sm text-gray-900">{item.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-500 text-center sm:text-left">
          Showing{" "}
          <span className="font-medium">{filteredReferrals.length}</span> of{" "}
          <span className="font-medium">{meta.total || 0}</span> results
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          {[...Array(meta.last_page || 1)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => handlePageChange(index + 1)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg shadow-sm ${
                page === index + 1
                  ? "text-white bg-primary"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {index + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === (meta.last_page || 1)}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Referrals;
