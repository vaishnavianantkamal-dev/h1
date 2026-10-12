import React from "react";
import Modal from "../Modal";
import { getStatusColor, getPaymentStatusColor } from "../../utils/bookingStatus";

const BookingDetailsModal = ({
  isBookingDetailsModalOpen,
  setIsBookingDetailsModalOpen,
  selectedBooking,
}) => {
  return (
      <Modal
        isOpen={isBookingDetailsModalOpen}
        onClose={() => setIsBookingDetailsModalOpen(false)}
        title="Booking Details"
        size="lg"
      >
        {!selectedBooking ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No booking selected.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                {selectedBooking.id}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedBooking.status)}`}
              >
                {selectedBooking.status}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(selectedBooking.payment_status)}`}
              >
                {selectedBooking.payment_status === "payment_pending"
                  ? "Payment Pending"
                  : selectedBooking.payment_status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Customer
                </p>
                <p className="font-medium text-gray-900">
                  {selectedBooking.customerName}
                </p>
                <p className="text-gray-600 font-mono">
                  {selectedBooking.customerId}
                </p>
                <p className="text-gray-600 font-mono">
                  {selectedBooking.customerPhone}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Service
                  {Array.isArray(selectedBooking.bookedServices) &&
                  selectedBooking.bookedServices.length > 1
                    ? "s"
                    : ""}
                </p>
                {Array.isArray(selectedBooking.bookedServices) &&
                selectedBooking.bookedServices.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedBooking.bookedServices.map((svc) => (
                      <li
                        key={svc.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-gray-900">
                          {svc.name}
                        </span>
                        {svc.quantity > 1 && (
                          <span className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                            x{svc.quantity}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-medium text-gray-900">
                    {selectedBooking.serviceType}
                  </p>
                )}
                <p className="text-gray-600 mt-1">
                  {selectedBooking.subscriptionName || "N/A"}
                </p>
                <p className="text-gray-600">
                  Source: {selectedBooking.source || "web"}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Address
              </p>
              <p className="text-sm text-gray-800 break-words">
                {selectedBooking.location || "N/A"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border border-gray-100">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Schedule
                </p>
                <p className="text-gray-800">Date: {selectedBooking.date}</p>
                <p className="text-gray-800">
                  Time Slot: {selectedBooking.time}
                </p>
                <p className="text-gray-800">
                  Start:{" "}
                  {selectedBooking.subscriptionStart || selectedBooking.date}
                </p>
                <p className="text-gray-800">
                  End: {selectedBooking.subscriptionEnd || selectedBooking.date}
                </p>
                <p className="text-gray-800">
                  Created At: {selectedBooking.createdAt || "N/A"}
                </p>
                <p className="text-gray-800">
                  Service Started At:{" "}
                  {selectedBooking.serviceStartedAt || "N/A"}
                </p>
                <p className="text-gray-800">
                  Service Ended At: {selectedBooking.serviceEndedAt || "N/A"}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-gray-100">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Amount
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  ₹{Number(selectedBooking.amount || 0).toFixed(2)}
                </p>
                {Number(selectedBooking.discountAmount) > 0 && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Discount: ₹
                    {Number(selectedBooking.discountAmount).toFixed(2)}
                    {selectedBooking.originalAmount != null && (
                      <span className="text-gray-400 line-through ml-1.5">
                        ₹{Number(selectedBooking.originalAmount).toFixed(2)}
                      </span>
                    )}
                  </p>
                )}
                <p className="text-gray-600 mt-2">
                  Worker: {selectedBooking.workerName || "Unassigned"}
                </p>
                {selectedBooking.workersRequired > 0 && (
                  <p className="text-gray-600">
                    Workers required:{" "}
                    <span className="font-semibold text-amber-700">
                      {selectedBooking.workersRequired}
                    </span>
                  </p>
                )}
                <p className="text-gray-600">
                  Coordinators:{" "}
                  {selectedBooking.coordinators?.length
                    ? selectedBooking.coordinators.map((c) => c.name).join(", ")
                    : "Not assigned"}
                </p>
                {(selectedBooking.platformFee != null ||
                  selectedBooking.travellingCharge != null ||
                  selectedBooking.taxAmount != null ||
                  selectedBooking.rainCharge != null) && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">
                      Fee Breakdown
                    </p>
                    {selectedBooking.platformFee != null && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Platform Fee</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.platformFee).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.travellingCharge != null && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Travelling Charge</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.travellingCharge).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.rainCharge != null && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Rain Charge</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.rainCharge).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.taxAmount != null && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Tax</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.taxAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
  );
};

export default BookingDetailsModal;
