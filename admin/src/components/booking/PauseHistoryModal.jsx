import React from "react";
import { Calendar, Clock } from "lucide-react";
import Modal from "../Modal";

const STATUS_STYLES = {
  active: "bg-orange-50 text-orange-700 border-orange-100",
  resumed: "bg-green-50 text-green-700 border-green-100",
  cancelled: "bg-gray-50 text-gray-600 border-gray-200",
  expired: "bg-gray-50 text-gray-600 border-gray-200",
};

const deriveStatus = (log) => {
  if (log.status) return log.status;
  if (log.resumed_at) return "Resumed";
  if (log.cancelled_at) return "Cancelled";
  return "Active";
};

const PauseHistoryModal = ({
  isPauseHistoryModalOpen,
  setIsPauseHistoryModalOpen,
  setPauseHistoryBookingId,
  pauseHistoryData,
  isLoadingPauseHistory,
}) => {
  const records = Array.isArray(pauseHistoryData)
    ? pauseHistoryData
    : Array.isArray(pauseHistoryData?.history)
      ? pauseHistoryData.history
      : Array.isArray(pauseHistoryData?.data)
        ? pauseHistoryData.data
        : [];

  return (
    <Modal
      isOpen={isPauseHistoryModalOpen}
      onClose={() => {
        setIsPauseHistoryModalOpen(false);
        setPauseHistoryBookingId(null);
      }}
      title="Pause History"
      size="lg"
    >
      {isLoadingPauseHistory ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Loading history...
        </div>
      ) : records.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          No pause history found.
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {records.map((log, idx) => {
            const from = log.pause_from || log.paused_from || log.from_date;
            const until = log.pause_until || log.paused_until || log.to_date;
            const status = deriveStatus(log);
            const badgeClass =
              STATUS_STYLES[String(status).toLowerCase()] ||
              "bg-gray-50 text-gray-600 border-gray-200";

            return (
              <div
                key={log.id ?? idx}
                className="p-3 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    <Calendar size={14} className="text-gray-400" />
                    {from || "N/A"} {"→"} {until || "N/A"}
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-xs italic text-gray-600">
                  <span className="font-medium not-italic">Reason:</span>{" "}
                  {log.reason || "N/A"}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1.5">
                  <Clock size={12} />
                  Requested at: {log.created_at || "N/A"}
                  {log.paused_by ? ` · By ${log.paused_by}` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default PauseHistoryModal;
