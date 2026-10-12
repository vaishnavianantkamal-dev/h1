import React from "react";
import { Check } from "lucide-react";
import Modal from "../Modal";

const CoordinatorModal = ({
  isCoordinatorModalOpen,
  setIsCoordinatorModalOpen,
  selectedBooking,
  isCoordinatorReassignMode,
  allCoordinators,
  selectedCoordinatorIds,
  toggleCoordinatorSelection,
  isAssigningCoordinator,
  isReassigningCoordinator,
  handleSaveCoordinatorAssignment,
}) => {
  return (
      <Modal
        isOpen={isCoordinatorModalOpen}
        onClose={() => setIsCoordinatorModalOpen(false)}
        title={
          isCoordinatorReassignMode
            ? "Reassign Coordinators"
            : "Assign Coordinator"
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <h4 className="text-sm font-medium text-indigo-900 mb-1">
              Booking Details
            </h4>
            <div className="flex flex-wrap gap-3 text-sm text-indigo-700">
              <span className="font-medium">#{selectedBooking?.id}</span>
              <span>{selectedBooking?.customerName}</span>
              <span>{selectedBooking?.serviceType}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Available Coordinators
              </h4>
              {selectedCoordinatorIds.length > 0 && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selectedCoordinatorIds.length} Selected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isCoordinatorReassignMode
                ? "Select coordinators to reassign for this booking"
                : "Select coordinators to assign to this booking"}
            </p>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {allCoordinators.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No coordinators available.
                </div>
              ) : (
                allCoordinators.map((coordinator) => {
                  const isSelected = selectedCoordinatorIds.includes(
                    coordinator.id,
                  );
                  return (
                    <button
                      key={coordinator.id}
                      type="button"
                      onClick={() => toggleCoordinatorSelection(coordinator.id)}
                      className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/40"
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {coordinator.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {coordinator.phone || "N/A"}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsCoordinatorModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCoordinatorAssignment}
              disabled={
                selectedCoordinatorIds.length === 0 ||
                isAssigningCoordinator ||
                isReassigningCoordinator
              }
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAssigningCoordinator || isReassigningCoordinator ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {isCoordinatorReassignMode ? "Reassign" : "Assign"}
                  {selectedCoordinatorIds.length > 0 &&
                    ` (${selectedCoordinatorIds.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
  );
};

export default CoordinatorModal;
