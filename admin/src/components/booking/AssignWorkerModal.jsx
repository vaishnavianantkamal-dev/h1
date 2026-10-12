import React from "react";
import { Search, X, Check, User, Calendar, Clock, Star, MapPin } from "lucide-react";
import Modal from "../Modal";
import { formatDateTime12 } from "../../utils/date";

const AssignWorkerModal = ({
  isAssignModalOpen,
  setIsAssignModalOpen,
  selectedBooking,
  isReassignMode,
  previousBookingWorkers,
  selectedWorkerIds,
  toggleWorkerSelection,
  workerSearch,
  setWorkerSearch,
  debouncedWorkerSearch,
  filteredWorkers,
  isLoadingWorkers,
  isFetchingUnassignedWorkers,
  isAssigning,
  isReassigning,
  handleSaveAssignment,
}) => {
  return (
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Worker"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Booking Details
            </h4>
            <div className="flex flex-wrap gap-4 text-sm text-blue-700">
              <span className="font-medium px-2 py-0.5 bg-blue-100 rounded-full text-xs">
                {selectedBooking?.serviceType}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={14} /> {selectedBooking?.customerName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {selectedBooking?.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {selectedBooking?.time}
              </span>
            </div>
          </div>

          {previousBookingWorkers.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Previous Workers
                  </h4>
                  <p className="text-xs text-gray-500">
                    Recently assigned workers for this booking. Click a worker
                    to select them.
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {previousBookingWorkers.length} worker
                  {previousBookingWorkers.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid gap-3">
                {previousBookingWorkers.map((worker) => {
                  const isSelected = selectedWorkerIds.includes(worker.id);
                  return (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => toggleWorkerSelection(worker.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        isSelected
                          ? "border-primary bg-blue-50"
                          : "border-gray-200 bg-white hover:border-primary hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {worker.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {worker.phone}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>
                            {worker.times_assigned ?? worker.timesAssigned ?? 0}{" "}
                            assignments
                          </div>
                          <div className="mt-1">
                            {worker.last_assigned_at
                              ? formatDateTime12(worker.last_assigned_at)
                              : "No date"}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                          <Check size={12} /> Selected
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Available Workers</h4>
              {selectedWorkerIds.length > 0 && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedWorkerIds.length} Selected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isReassignMode
                ? "Select workers to reassign this booking to"
                : "Select workers to assign to this booking"}
            </p>

            {/* Worker search */}
            <div className="relative mt-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                placeholder="Search workers by name or phone..."
                className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
              {workerSearch && (
                <button
                  type="button"
                  onClick={() => setWorkerSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full"
                  aria-label="Clear worker search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 mt-3 max-h-[400px] overflow-y-auto pr-1">
              {isLoadingWorkers || isFetchingUnassignedWorkers ? (
                <div className="text-center py-8 text-gray-500">
                  {debouncedWorkerSearch
                    ? `Searching workers for "${debouncedWorkerSearch}"...`
                    : "Loading available workers..."}
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {debouncedWorkerSearch ? (
                    <>
                      No workers found for{" "}
                      <span className="font-medium text-gray-900">
                        "{debouncedWorkerSearch}"
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      No unassigned workers available for{" "}
                      <span className="font-medium text-gray-900">
                        {selectedBooking?.serviceType}
                      </span>
                      .
                    </>
                  )}
                </div>
              ) : (
                filteredWorkers.map((worker) => {
                  const isSelected = selectedWorkerIds.includes(worker.id);
                  const avatar =
                    worker.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      worker.name || "Worker",
                    )}&background=random&color=fff`;

                  return (
                    <div
                      key={worker.id}
                      onClick={() => toggleWorkerSelection(worker.id)}
                      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all group ${
                        isSelected
                          ? "border-primary bg-blue-50 ring-1 ring-primary/20"
                          : "border-gray-200 hover:border-primary hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={avatar}
                            alt={worker.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {worker.name}
                          </h5>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1 text-yellow-600 font-medium">
                              <Star size={12} fill="currentColor" />{" "}
                              {worker.rating || "New"}
                            </span>
                            <span>{worker.jobs_completed || 0} Jobs</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {worker.address || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="text-primary font-semibold text-xs">
                            Selected
                          </span>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-primary transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAssignment}
              disabled={
                selectedWorkerIds.length === 0 || isAssigning || isReassigning
              }
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAssigning || isReassigning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {isReassignMode ? "Reassign" : "Assign"}{" "}
                  {selectedWorkerIds.length > 0 &&
                    `(${selectedWorkerIds.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
  );
};

export default AssignWorkerModal;
