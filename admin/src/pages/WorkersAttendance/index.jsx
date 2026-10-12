import React, { useState } from "react";
import {
  Search,
  ClipboardCheck,
  MapPin,
  LogIn,
  LogOut,
  Navigation,
  ArrowLeft,
  Users,
  Eye,
  Camera,
  X,
} from "lucide-react";
import { format, isValid } from "date-fns";
import TableSkeleton from "../../components/TableSkeleton";
import {
  useGetAttendanceWorkersQuery,
  useGetWorkerAttendanceLogsQuery,
  useGetCitiesQuery,
} from "../../api/apiSlice";
import { resolveMediaUrl } from "../../utils/imageUrl";

const fmt = (value, pattern, fallback = "—") => {
  if (!value) return fallback;
  const d = new Date(value);
  return isValid(d) ? format(d, pattern) : fallback;
};

/* ------------------------------------------------------------------ */
/* Workers List                                                         */
/* ------------------------------------------------------------------ */
const WorkersList = ({ onSelect }) => {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data: paginator = {}, isLoading, isFetching } =
    useGetAttendanceWorkersQuery({ page, city_id: cityFilter || undefined });

  const { data: cities = [] } = useGetCitiesQuery();

  const workers = Array.isArray(paginator.data) ? paginator.data : [];
  const lastPage = paginator.last_page || 1;
  const total = paginator.total || 0;
  const from = paginator.from || 0;
  const to = paginator.to || 0;

  const filtered = workers.filter((w) => {
    const q = search.toLowerCase();
    return (
      !q ||
      w.name.toLowerCase().includes(q) ||
      w.phone.toLowerCase().includes(q) ||
      (w.city?.name || "").toLowerCase().includes(q)
    );
  });

  const totalLogs = workers.reduce((s, w) => s + (w.attendance_logs_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="text-primary" size={24} />
            Workers Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Select a worker to view their attendance logs
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Workers</p>
            <p className="text-xl font-bold text-gray-900">{total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ClipboardCheck size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Logs (This Page)</p>
            <p className="text-xl font-bold text-gray-900">{totalLogs}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={4} rows={6} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Users size={36} className="mb-2 opacity-20" />
            <p className="text-sm">No workers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {["Worker", "Phone", "City", "Attendance Logs", ""].map((h) => (
                    <th
                      key={h}
                      className={`py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => onSelect(w)}
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{w.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-sm text-gray-600">{w.phone}</td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin size={13} className="text-gray-400" />
                        {w.city?.name || "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        w.attendance_logs_count > 0
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        {w.attendance_logs_count} {w.attendance_logs_count === 1 ? "log" : "logs"}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(w); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                      >
                        <Eye size={13} />
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && lastPage > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{" "}
              <span className="font-medium">{total}</span> workers
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    page === n ? "text-white bg-primary" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage || isFetching}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Worker Detail Logs                                                   */
/* ------------------------------------------------------------------ */
const WorkerLogs = ({ worker, onBack }) => {
  const [page, setPage] = useState(1);
  const [photoUrl, setPhotoUrl] = useState(null);

  const { data: result = {}, isLoading, isFetching } =
    useGetWorkerAttendanceLogsQuery({ workerId: worker.id, page });

  const workerInfo = result.worker || worker;
  const paginator = result.paginator || {};
  const logs = Array.isArray(paginator.data) ? paginator.data : [];
  const lastPage = paginator.last_page || 1;
  const total = paginator.total || 0;
  const from = paginator.from || 0;
  const to = paginator.to || 0;

  const checkedOut = logs.filter((l) => l.check_out_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
            {workerInfo?.name?.charAt(0).toUpperCase() || "W"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{workerInfo?.name}</h1>
            <p className="text-sm text-gray-500">{workerInfo?.phone}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Checked Out</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{checkedOut}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Still Checked In</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{logs.length - checkedOut}</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={5} rows={5} />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <ClipboardCheck size={36} className="mb-2 opacity-20" />
            <p className="text-sm">No attendance logs found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {["Date", "Zone", "Check In", "Check Out", "Status"].map((h) => (
                    <th key={h} className="py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const isOut = Boolean(log.check_out_at);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-6 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {fmt(log.date, "dd MMM yyyy")}
                      </td>

                      {/* Zone */}
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin size={13} className="text-gray-400" />
                          {log.zone?.name || "—"}
                        </span>
                      </td>

                      {/* Check In */}
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <LogIn size={14} className="text-blue-500 shrink-0" />
                            {fmt(log.check_in_at, "dd MMM, hh:mm a")}
                          </span>
                          {log.check_in_distance_m != null && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 pl-5">
                              <Navigation size={10} />
                              {log.check_in_distance_m} m away
                            </span>
                          )}
                          {log.check_in_photo && (
                            <button
                              onClick={() => setPhotoUrl(resolveMediaUrl(log.check_in_photo))}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 pl-5 transition-colors"
                            >
                              <Camera size={11} /> View photo
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Check Out */}
                      <td className="py-3.5 px-6">
                        {isOut ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                              <LogOut size={14} className="text-green-500 shrink-0" />
                              {fmt(log.check_out_at, "dd MMM, hh:mm a")}
                            </span>
                            {log.check_out_distance_m != null && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400 pl-5">
                                <Navigation size={10} />
                                {log.check_out_distance_m} m away
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not checked out</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        {isOut ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                            Checked Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            Checked In
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && lastPage > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{" "}
              <span className="font-medium">{total}</span> logs
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    page === n ? "text-white bg-primary" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage || isFetching}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Photo lightbox */}
      {photoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPhotoUrl(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPhotoUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={photoUrl}
              alt="Check-in photo"
              className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Root                                                                 */
/* ------------------------------------------------------------------ */
const WorkersAttendance = () => {
  const [selectedWorker, setSelectedWorker] = useState(null);

  if (selectedWorker) {
    return (
      <WorkerLogs
        worker={selectedWorker}
        onBack={() => setSelectedWorker(null)}
      />
    );
  }

  return <WorkersList onSelect={setSelectedWorker} />;
};

export default WorkersAttendance;
