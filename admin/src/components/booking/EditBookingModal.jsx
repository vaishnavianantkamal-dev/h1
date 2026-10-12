import React from "react";
import { format } from "date-fns";
import Modal from "../Modal";
import { toInputDate } from "../../utils/date";

const EditBookingModal = ({
  isEditModalOpen,
  setIsEditModalOpen,
  editBooking,
  isUpdating,
  handleUpdateBooking,
}) => {
  return (
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Booking"
        size="lg"
      >
        {editBooking &&
          (() => {
            const currentTimeSlot =
              editBooking.time_slot || editBooking.time || "";

            // Generate 15-min intervals from 9 AM to 8 PM
            const baseTimeSlots = [];
            let current = new Date();
            current.setHours(9, 0, 0, 0);
            const endTime = new Date();
            endTime.setHours(20, 0, 0, 0);

            while (current <= endTime) {
              baseTimeSlots.push(format(current, "hh:mm a"));
              current = new Date(current.getTime() + 15 * 60000);
            }

            const timeSlotOptions =
              currentTimeSlot && !baseTimeSlots.includes(currentTimeSlot)
                ? [currentTimeSlot, ...baseTimeSlots]
                : baseTimeSlots;

            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const startDate = formData.get("start_date");
                  const endDate = formData.get("end_date");
                  const singleDate = formData.get("booking_date");
                  const bookingData = {
                    booking_date: singleDate || startDate || editBooking.date,
                    start_date: startDate || singleDate || undefined,
                    end_date: endDate || singleDate || undefined,
                    time_slot: formData.get("time_slot"),
                    status: formData.get("status"),
                    payment_status: formData.get("payment_status"),
                  };
                  handleUpdateBooking(bookingData);
                }}
                className="space-y-6"
              >
                {/* Booking Date / Subscription Dates */}
                {editBooking.subscriptionStart &&
                editBooking.subscriptionEnd &&
                editBooking.subscriptionStart !==
                  editBooking.subscriptionEnd ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        defaultValue={toInputDate(
                          editBooking.subscriptionStart,
                        )}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        defaultValue={toInputDate(editBooking.subscriptionEnd)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking Date
                    </label>
                    <input
                      type="date"
                      name="booking_date"
                      defaultValue={toInputDate(
                        editBooking.booking_date ||
                          editBooking.subscriptionStart ||
                          editBooking.date,
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                )}

                {/* Time Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Slot
                  </label>
                  <select
                    name="time_slot"
                    defaultValue={currentTimeSlot}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">Select Time Slot</option>
                    {timeSlotOptions.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editBooking.status?.toLowerCase()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="pending">Pending</option>

                    <option value="cancelled">Cancelled</option>
                    <option value="assigned">Assigned</option>
                    <option value="inprogress">In Progress</option>
                    {/* <option value="reassigned">Reassigned</option> */}
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    name="payment_status"
                    defaultValue={editBooking.payment_status?.toLowerCase()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="payment_pending">Payment Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? "Updating..." : "Update Booking"}
                  </button>
                </div>
              </form>
            );
          })()}
      </Modal>
  );
};

export default EditBookingModal;
