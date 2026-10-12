import React, { useEffect, useState } from "react";
import { Search, MapPin, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetServiceRequestsQuery,
  useUpdateServiceRequestStatusMutation,
} from "../../api/apiSlice";
import TableSkeleton from "../../components/TableSkeleton";

// Hobit1: booking requests submitted from the website's service cards.

const STATUSES = [
  { value: "new", label: "New", className: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Contacted", className: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "confirmed", label: "Confirmed", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "completed", label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  { value: "cancelled", label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
];

const PAYMENT_LABELS = {
  cash: "Cash after service",
  upi: "UPI after service",
  online: "Online payment",
};

const TIME_LABELS = {
  morning: "Morning (8–12)",
  afternoon: "Afternoon (12–4)",
  evening: "Evening (4–8)",
};

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const ServiceRequests = () => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce the server-side search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: response, isLoading, isFetching } = useGetServiceRequestsQuery({
    page: currentPage,
    status,
    search,
  });
  const [updateStatus] = useUpdateServiceRequestStatusMutation();

  const paginationData = response?.data || {};
  const requests = Array.isArray(paginationData?.data) ? paginationData.data : [];
  const lastPage = paginationData?.last_page || 1;
  const total = paginationData?.total || 0;

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      toast.success("Status updated");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Booking requests from the website ({total} total)
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 lg:max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, phone, service, pincode..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ value: "", label: "All" }, ...STATUSES].map((s) => (
            <button
              key={s.value || "all"}
              type="button"
              onClick={() => {
                setStatus(s.value);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                status === s.value
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={7} rows={10} />
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No service requests found</div>
        ) : (
          <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {["ID / Received", "Customer", "Service", "Address", "Preferred visit", "Payment / Notes", "Status"].map((h) => (
                    <th key={h} className="py-4 px-5 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => {
                  const statusInfo = STATUSES.find((s) => s.value === r.status) || STATUSES[0];
                  return (
                    <tr key={r.id} className="align-top hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">#{r.id}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatDate(r.created_at, true)}</div>
                      </td>
                      <td className="py-4 px-5 min-w-[180px]">
                        <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                        <a href={`tel:+91${r.phone}`} className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline">
                          <Phone size={13} /> +91 {r.phone}
                        </a>
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:underline break-all">
                            <Mail size={12} /> {r.email}
                          </a>
                        )}
                      </td>
                      <td className="py-4 px-5 min-w-[180px]">
                        <div className="text-sm font-medium text-gray-900">{r.service_name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {r.category}
                          {r.sub_category ? ` › ${r.sub_category}` : ""}
                        </div>
                      </td>
                      <td className="py-4 px-5 min-w-[220px] max-w-xs">
                        <div className="text-sm text-gray-700 break-words">{r.address}</div>
                        {(r.locality || r.landmark) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {[r.locality, r.landmark && `Near ${r.landmark}`].filter(Boolean).join(", ")}
                          </div>
                        )}
                        <div className="text-xs font-medium text-gray-600 mt-1">
                          {r.city} – {r.pincode}
                        </div>
                        {r.latitude && r.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <MapPin size={12} /> Open in Maps
                          </a>
                        )}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {r.preferred_date ? formatDate(r.preferred_date) : "Any date"}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {TIME_LABELS[r.preferred_time] || "Any time"}
                        </div>
                      </td>
                      <td className="py-4 px-5 min-w-[160px] max-w-xs">
                        <div className="text-sm text-gray-700">
                          {PAYMENT_LABELS[r.payment_method] || r.payment_method}
                        </div>
                        {r.notes && (
                          <div className="text-xs text-gray-500 mt-1 break-words">{r.notes}</div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <select
                          value={r.status}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none cursor-pointer ${statusInfo.className}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {lastPage}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
            disabled={currentPage === lastPage}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceRequests;
