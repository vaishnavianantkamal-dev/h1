import React from "react";
import { Calendar, Clock, Download } from "lucide-react";
import Modal from "../Modal";

const formatTime12 = (t) => {
  if (!t) return "";
  const parts = String(t).split(":");
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] ?? "00";
  if (Number.isNaN(hour)) return t;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

const ExportBookingsModal = ({
  isExportModalOpen,
  setIsExportModalOpen,
  exportOptions,
  setExportOptions,
  isExportingReport,
  handleExportReport,
  subscriptionTypes,
  serviceCategories,
  cities,
  timeSlots = [],
}) => {
  return (
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={`Export Bookings as ${exportOptions.format === "excel" ? "Excel" : "PDF"}`}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExportReport();
          }}
          className="space-y-5"
        >
          {/* Format toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Format
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {["pdf", "excel"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setExportOptions((prev) => ({ ...prev, format: f }))
                  }
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    exportOptions.format === f
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {f === "pdf" ? "PDF" : "Excel"}
                </button>
              ))}
            </div>
          </div>

          {/* Status + Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Status
              </label>
              <select
                value={exportOptions.status}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Payment Status
              </label>
              <select
                value={exportOptions.payment_status}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    payment_status: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              >
                <option value="">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Subscription + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Subscription Type
              </label>
              <select
                value={exportOptions.subscription_type_id}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    subscription_type_id: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              >
                <option value="">All Subscription Types</option>
                {subscriptionTypes.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Category
              </label>
              <select
                value={exportOptions.category_id}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    category_id: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              >
                <option value="">All Categories</option>
                {serviceCategories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                City
              </label>
              <select
                value={exportOptions.city_id}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    city_id: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              >
                <option value="">All Cities</option>
                {cities.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Today toggle */}
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-blue-900">
              <Calendar size={14} />
              Only today's bookings
              <span className="text-xs text-blue-700/70">
                (ignored if a date range is set)
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setExportOptions((prev) => ({ ...prev, today: !prev.today }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                exportOptions.today ? "bg-primary" : "bg-gray-300"
              }`}
              aria-pressed={exportOptions.today}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  exportOptions.today ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                From Date
              </label>
              <input
                type="date"
                value={exportOptions.from_date}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    from_date: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                To Date
              </label>
              <input
                type="date"
                value={exportOptions.to_date}
                min={exportOptions.from_date || undefined}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    to_date: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Time slot range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Slot From
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
                <Clock size={14} className="text-gray-400" />
                <select
                  value={exportOptions.slot_from}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      slot_from: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">Any</option>
                  {timeSlots.map((s) => {
                    const value = formatTime12(s.slot_time);
                    return (
                      <option key={s.id} value={value}>
                        {s.display_label || value}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Slot To
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
                <Clock size={14} className="text-gray-400" />
                <select
                  value={exportOptions.slot_to}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      slot_to: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">Any</option>
                  {timeSlots.map((s) => {
                    const value = formatTime12(s.slot_time);
                    return (
                      <option key={s.id} value={value}>
                        {s.display_label || value}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() =>
                setExportOptions({
                  format: exportOptions.format,
                  status: "",
                  payment_status: "",
                  subscription_type_id: "",
                  category_id: "",
                  from_date: "",
                  to_date: "",
                  slot_from: "",
                  slot_to: "",
                  today: false,
                })
              }
              className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Reset filters
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExportingReport}
                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExportingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download{" "}
                    {exportOptions.format === "excel" ? "Excel" : "PDF"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>
  );
};

export default ExportBookingsModal;
