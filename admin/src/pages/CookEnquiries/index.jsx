import React, { useState } from "react";
import { Search } from "lucide-react";
import { useGetDeepCleaningEnquiriesQuery } from "../../api/apiSlice";
import TableSkeleton from "../../components/TableSkeleton";

const CookEnquiries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: enquiriesResponse, isLoading } =
    useGetDeepCleaningEnquiriesQuery({ page: currentPage });

  const paginationData = enquiriesResponse?.data || {};
  const enquiries = Array.isArray(paginationData?.data)
    ? paginationData.data
    : [];
  const meta = {
    current_page: paginationData?.current_page || 1,
    last_page: paginationData?.last_page || 1,
    per_page: paginationData?.per_page || 10,
    total: paginationData?.total || 0,
  };

  const filteredEnquiries = enquiries.filter((enquiry) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      enquiry.name?.toLowerCase().includes(term) ||
      enquiry.contact_no?.toLowerCase().includes(term) ||
      enquiry.email?.toLowerCase().includes(term) ||
      enquiry.requirements?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Deep Cleaning Enquiries
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View deep cleaning service enquiries
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 sm:w-80">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search enquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={6} rows={10} />
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No enquiries found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                    Contact No
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                    Requirements
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEnquiries.map((enquiry) => (
                  <tr
                    key={enquiry.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-gray-900">
                        {enquiry.id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-gray-900">
                        {enquiry.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">
                        {enquiry.contact_no}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">
                        {enquiry.email || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <div className="text-sm text-gray-700 break-words">
                        {enquiry.requirements}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-700">
                        {formatDate(enquiry.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {meta.last_page}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(meta.last_page, p + 1))
            }
            disabled={currentPage === meta.last_page}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CookEnquiries;
