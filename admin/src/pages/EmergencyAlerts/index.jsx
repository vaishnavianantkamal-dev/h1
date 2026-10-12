import React, { useState } from "react";
import {
  Siren,
  MapPin,
  Clock,
  CheckCircle2,
  ShieldCheck,
  RefreshCcw,
  User,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import TableSkeleton from "../../components/TableSkeleton";
import {
  useGetEmergencyAlertsQuery,
  useAcknowledgeEmergencyAlertMutation,
  useResolveEmergencyAlertMutation,
} from "../../api/apiSlice";

const ALERT_TYPE_STYLES = {
  safety: "bg-orange-50 text-orange-700 border-orange-200",
  medical: "bg-red-50 text-red-700 border-red-200",
  accident: "bg-amber-50 text-amber-700 border-amber-200",
  harassment: "bg-purple-50 text-purple-700 border-purple-200",
  other: "bg-gray-50 text-gray-700 border-gray-200",
};

const STATUS_STYLES = {
  pending: "bg-red-50 text-red-700 border-red-200",
  active: "bg-red-50 text-red-700 border-red-200",
  acknowledged: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
};

const formatDateTime12 = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const EmergencyAlerts = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [note, setNote] = useState("");

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useGetEmergencyAlertsQuery({ page: currentPage });

  const [acknowledgeAlert, { isLoading: isAcknowledging }] =
    useAcknowledgeEmergencyAlertMutation();
  const [resolveAlert, { isLoading: isResolving }] =
    useResolveEmergencyAlertMutation();

  // Laravel pagination: either { data: [...] , meta } or { data: { data: [...], last_page } }
  const paginator =
    response?.data && !Array.isArray(response.data) ? response.data : response;
  const alerts = Array.isArray(paginator?.data)
    ? paginator.data
    : Array.isArray(response?.data)
      ? response.data
      : [];
  const lastPage = paginator?.last_page || response?.meta?.last_page || 1;
  const total = paginator?.total || response?.meta?.total || alerts.length;

  const statusOf = (alert) => (alert?.status || "pending").toLowerCase();

  const openDetails = (alert) => {
    setSelectedAlert(alert);
    setNote("");
  };

  const closeDetails = () => {
    setSelectedAlert(null);
    setNote("");
  };

  const handleAcknowledge = async (alert, noteText = "") => {
    try {
      await acknowledgeAlert({ id: alert.id, note: noteText.trim() }).unwrap();
      toast.success(`Alert #${alert.id} acknowledged`);
      closeDetails();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to acknowledge alert");
    }
  };

  const handleResolve = async (alert, noteText = "") => {
    try {
      await resolveAlert({ id: alert.id, note: noteText.trim() }).unwrap();
      toast.success(`Alert #${alert.id} resolved`);
      closeDetails();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to resolve alert");
    }
  };

  const mapsUrl = (alert) =>
    alert?.latitude != null && alert?.longitude != null
      ? `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`
      : null;

  const workerName = (alert) =>
    alert?.worker?.name ||
    alert?.worker_name ||
    `Worker #${alert?.worker_id ?? "?"}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Emergency / SOS Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Worker SOS alerts — acknowledge and resolve incidents
          </p>
        </div>
        <TableSkeleton columns={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Emergency / SOS Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Worker SOS alerts — acknowledge and resolve incidents
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={isFetching}
          className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCcw size={18} className={isFetching ? "animate-spin" : ""} />
          <span className="font-medium">Refresh</span>
        </button>
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {[
                  "ID",
                  "Worker",
                  "Booking",
                  "Type",
                  "Message",
                  "Location",
                  "Raised At",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    No emergency alerts found.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const status = statusOf(alert);
                  return (
                    <tr
                      key={alert.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium text-gray-900">
                        #{alert.id}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {workerName(alert)}
                            </p>
                            {(alert.worker?.mobile || alert.worker_mobile) && (
                              <p className="text-xs text-gray-500">
                                {alert.worker?.mobile || alert.worker_mobile}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-800">
                        {alert.booking_id ? `#${alert.booking_id}` : "N/A"}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                            ALERT_TYPE_STYLES[alert.alert_type] ||
                            ALERT_TYPE_STYLES.other
                          }`}
                        >
                          {alert.alert_type || "other"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm text-gray-700 truncate max-w-[220px]">
                          {alert.message || "—"}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        {mapsUrl(alert) ? (
                          <a
                            href={mapsUrl(alert)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <MapPin size={14} />
                            View Map
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400 italic">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Clock size={14} />
                          {formatDateTime12(alert.created_at)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                            STATUS_STYLES[status] || STATUS_STYLES.pending
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetails(alert)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                          >
                            View
                          </button>
                          {status !== "resolved" && (
                            <>
                              {status !== "acknowledged" && (
                                <button
                                  onClick={() => handleAcknowledge(alert)}
                                  disabled={isAcknowledging || isResolving}
                                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  Acknowledge
                                </button>
                              )}
                              <button
                                onClick={() => handleResolve(alert)}
                                disabled={isAcknowledging || isResolving}
                                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
            No emergency alerts found.
          </div>
        ) : (
          alerts.map((alert) => {
            const status = statusOf(alert);
            return (
              <div
                key={alert.id}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Siren size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-gray-900">
                      #{alert.id}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                      STATUS_STYLES[status] || STATUS_STYLES.pending
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {workerName(alert)}
                </p>
                <p className="text-sm text-gray-600">{alert.message || "—"}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">
                    {alert.alert_type || "other"}
                  </span>
                  <span>{formatDateTime12(alert.created_at)}</span>
                </div>
                <button
                  onClick={() => openDetails(alert)}
                  className="w-full py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  View Details
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{lastPage}</span> —{" "}
            <span className="font-medium">{total}</span> alerts
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isFetching}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
              disabled={currentPage >= lastPage || isFetching}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={closeDetails}
        title={selectedAlert ? `SOS Alert #${selectedAlert.id}` : ""}
        size="lg"
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                  ALERT_TYPE_STYLES[selectedAlert.alert_type] ||
                  ALERT_TYPE_STYLES.other
                }`}
              >
                {selectedAlert.alert_type || "other"}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                  STATUS_STYLES[statusOf(selectedAlert)] ||
                  STATUS_STYLES.pending
                }`}
              >
                {statusOf(selectedAlert)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Worker
                </p>
                <p className="font-medium text-gray-900">
                  {workerName(selectedAlert)}
                </p>
                {(selectedAlert.worker?.mobile ||
                  selectedAlert.worker_mobile) && (
                  <p className="text-gray-600">
                    {selectedAlert.worker?.mobile ||
                      selectedAlert.worker_mobile}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Booking
                </p>
                <p className="font-medium text-gray-900">
                  {selectedAlert.booking_id
                    ? `#${selectedAlert.booking_id}`
                    : "N/A"}
                </p>
                <p className="text-gray-600">
                  Raised: {formatDateTime12(selectedAlert.created_at)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Message
              </p>
              <p className="text-sm text-gray-800 break-words">
                {selectedAlert.message || "No message provided."}
              </p>
            </div>

            {mapsUrl(selectedAlert) && (
              <div className="p-3 rounded-lg border border-gray-100">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Location
                </p>
                <a
                  href={mapsUrl(selectedAlert)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <MapPin size={15} />
                  {selectedAlert.latitude}, {selectedAlert.longitude} — open in
                  Google Maps
                </a>
              </div>
            )}

            {(selectedAlert.handled_by ||
              selectedAlert.handled_at ||
              selectedAlert.handled_note) && (
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Handling
                </p>
                {selectedAlert.handled_by && (
                  <p className="text-sm text-gray-800">
                    Handled by:{" "}
                    {selectedAlert.handler?.name ||
                      selectedAlert.handled_by?.name}
                  </p>
                )}
                {selectedAlert.handled_at && (
                  <p className="text-sm text-gray-800">
                    Handled at: {formatDateTime12(selectedAlert.handled_at)}
                  </p>
                )}
                {selectedAlert.handled_note && (
                  <p className="text-sm text-gray-800 break-words">
                    Note: {selectedAlert.handled_note}
                  </p>
                )}
              </div>
            )}

            {statusOf(selectedAlert) !== "resolved" && (
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Note (optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. On it, calling the worker now."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {statusOf(selectedAlert) !== "acknowledged" && (
                    <button
                      onClick={() => handleAcknowledge(selectedAlert, note)}
                      disabled={isAcknowledging || isResolving}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                    >
                      <ShieldCheck size={15} />
                      {isAcknowledging ? "Acknowledging…" : "Acknowledge"}
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(selectedAlert, note)}
                    disabled={isAcknowledging || isResolving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} />
                    {isResolving ? "Resolving…" : "Resolve"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmergencyAlerts;
