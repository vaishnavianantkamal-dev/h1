import React from "react";
import Modal from "../Modal";

const RescheduleHistoryModal = ({
  isRescheduleModalOpen,
  setIsRescheduleModalOpen,
  setRescheduleBookingId,
  rescheduleData,
  isLoadingReschedule,
}) => {
  return (
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setRescheduleBookingId(null);
        }}
        title="Reschedule History"
        size="lg"
      >
        {isLoadingReschedule ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading history...
          </div>
        ) : !rescheduleData ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No data available.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    Booking Details - BK-{rescheduleData.booking_id}
                  </p>
                  <p className="text-xs text-gray-500">
                    Current Date:{" "}
                    <span className="font-medium">
                      {rescheduleData.current_booking_date}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Current Slot:{" "}
                    <span className="font-medium">
                      {rescheduleData.current_time_slot}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Reschedule Count:{" "}
                    <span className="font-bold text-primary">
                      {rescheduleData.reschedule_count}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Last: {rescheduleData.last_rescheduled_at}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                History Logs
              </h4>
              {Array.isArray(rescheduleData.history) &&
              rescheduleData.history.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {rescheduleData.history.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">
                            Old Schedule
                          </p>
                          <p className="font-medium text-gray-700">
                            {log.old_date}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.old_time_slot}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold text-right">
                            New Schedule
                          </p>
                          <p className="font-medium text-gray-700 text-right">
                            {log.new_date}
                          </p>
                          <p className="text-xs text-gray-500 text-right">
                            {log.new_time_slot}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-50">
                        <p className="text-xs italic text-gray-600">
                          <span className="font-medium not-italic">
                            Reason:
                          </span>{" "}
                          {log.reason || "N/A"}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 text-right">
                          Requested at: {log.created_at}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No reschedule history logs found.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
  );
};

export default RescheduleHistoryModal;
