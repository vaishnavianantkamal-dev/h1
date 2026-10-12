import React from "react";
import {
  MoreVertical,
  Calendar,
  Clock,
  User,
  MapPin,
  Eye,
  CreditCard,
  Key,
  PauseCircle,
  History,
} from "lucide-react";
import { getStatusColor } from "../../utils/bookingStatus";
import LocationDisplay from "./LocationDisplay";
import ServiceNameDisplay from "./ServiceNameDisplay";
import WorkerNamesDisplay from "./WorkerNamesDisplay";
import CoordinatorNamesDisplay from "./CoordinatorNamesDisplay";

const BookingCard = ({
  currentItems,
  activeMenuId,
  setActiveMenuId,
  handleShowBookingDetails,
  handleAssignClick,
  handleReassignClick,
  handleAssignCoordinatorClick,
  handleReassignCoordinatorClick,
  handleSendPaymentLink,
  handleSendBothOtp,
  handleUpdateLocationSubmit,
  handleViewExtensions,
  handleViewRescheduleHistory,
  handlePauseBookingClick,
  handleViewPauseHistory,
}) => {
  return (
      <div className="md:hidden space-y-4">
        {currentItems.map((booking) => (
          <div
            key={booking.id}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4"
          >
            {/* Header: ID & Status */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-medium text-gray-900">
                  {booking.id}
                </span>
                <div className="text-xs text-gray-500 mt-0.5">
                  {Array.isArray(booking.bookedServices) &&
                  booking.bookedServices.length > 0 ? (
                    <div className="space-y-0.5">
                      {booking.bookedServices.map((svc) => (
                        <div key={svc.id} className="flex items-start gap-1.5">
                          <ServiceNameDisplay name={svc.name} />
                          {svc.quantity > 1 && (
                            <span className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1 rounded">
                              x{svc.quantity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ServiceNameDisplay name={booking.serviceType} />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                  {booking.serviceGroup && (
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
                      {booking.serviceGroup}
                    </span>
                  )}
                  {booking.sizeType && (
                    <span className="text-[10px] text-gray-500">
                      {booking.sizeValue} {booking.sizeType}
                    </span>
                  )}
                  {booking.subscriptionName && (
                    <span className="text-[10px] font-semibold text-blue-500">
                      {booking.subscriptionName}
                    </span>
                  )}
                </div>
                {booking.serviceType.toLowerCase().includes("instant help") && (
                  <button
                    type="button"
                    onClick={() => handleViewExtensions(booking)}
                    className="mt-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    View Extensions
                  </button>
                )}
                {booking.hasRescheduleHistory && (
                  <button
                    type="button"
                    onClick={() => handleViewRescheduleHistory(booking)}
                    className="mt-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 block"
                  >
                    Reschedule History
                  </button>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}
              >
                {booking.status}
              </span>
            </div>

            {/* Customer & Worker */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
              <div>
                <p className="text-xs text-gray-500 mb-2">Customer</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {booking.customerName
                      ? booking.customerName.charAt(0)
                      : "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {booking.customerName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {booking.customerId}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {booking.customerPhone}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Worker</p>
                {booking.workersRequired > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 mb-1.5">
                    <User size={10} />
                    Requires {booking.workersRequired} worker
                    {booking.workersRequired > 1 ? "s" : ""}
                  </span>
                )}
                <WorkerNamesDisplay
                  workers={booking.assignedWorkers}
                  fallbackName={booking.workerName}
                  fallbackId={booking.workerId}
                />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-2">Coordinator</p>
                <CoordinatorNamesDisplay coordinators={booking.coordinators} />
              </div>
            </div>

            {/* Details: Date, Time, Location */}
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={14} className="text-gray-400" />
                {booking.subscriptionStart && booking.subscriptionEnd
                  ? booking.subscriptionStart === booking.subscriptionEnd
                    ? booking.subscriptionStart
                    : `${booking.subscriptionStart} \u2192 ${booking.subscriptionEnd}`
                  : booking.date}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={14} className="text-gray-400" />
                {booking.time}
              </div>
              {booking.serviceEndedAt !== "N/A" && (
                <div className="col-span-2 flex items-center gap-2 text-gray-600">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-tight">
                    Ended At:
                  </span>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock size={14} className="text-gray-400" />
                    {booking.serviceEndedAt}
                  </div>
                </div>
              )}
              <div className="col-span-2 flex items-start gap-2 text-gray-600">
                <MapPin
                  size={14}
                  className="text-gray-400 mt-1 flex-shrink-0"
                />
                <LocationDisplay location={booking.location} />
              </div>
            </div>

            {/* Footer: Amount & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-lg font-bold text-gray-900">
                  ₹{Number(booking.amount || 0).toFixed(2)}
                </p>
                {Number(booking.discountAmount) > 0 && (
                  <p className="text-[11px] text-green-600 whitespace-nowrap">
                    ₹{Number(booking.discountAmount).toFixed(2)}
                    {booking.originalAmount != null && (
                      <span className="text-gray-400 line-through ml-1">
                        ₹{Number(booking.originalAmount).toFixed(2)}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShowBookingDetails(booking)}
                  className="p-2 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                  title="Show Booking"
                  aria-label="Show Booking"
                >
                  <Eye size={16} />
                </button>
                {booking.status === "Pending" && (
                  <button
                    onClick={() => handleAssignClick(booking)}
                    className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Assign
                  </button>
                )}
                <button
                  onClick={() =>
                    booking.coordinatorIds?.length > 0
                      ? handleReassignCoordinatorClick(booking)
                      : handleAssignCoordinatorClick(booking)
                  }
                  className="px-4 py-2 bg-white text-indigo-700 border border-indigo-200 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  {booking.coordinatorIds?.length > 0
                    ? "Reassign Coordinator"
                    : "Assign Coordinator"}
                </button>
                {booking.workerId &&
                  booking.subscriptionName &&
                  booking.subscriptionName
                    .toLowerCase()
                    .includes("monthly") && (
                    <button
                      onClick={() => handleReassignClick(booking)}
                      className="px-4 py-2 bg-white text-primary border border-primary text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      Reassign
                    </button>
                  )}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveMenuId(
                        activeMenuId === booking.id ? null : booking.id,
                      )
                    }
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeMenuId === booking.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100">
                      <div className="py-1">
                        <button
                          onClick={() => handleSendPaymentLink(booking)}
                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                        >
                          <CreditCard size={14} />
                          Send Payment Link
                        </button>
                        {booking.serviceType
                          .toLowerCase()
                          .includes("instant help") && (
                          <button
                            onClick={() => handleViewExtensions(booking)}
                            className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                          >
                            <Clock size={14} />
                            View Extensions
                          </button>
                        )}
                        <button
                          onClick={() => handleSendBothOtp(booking)}
                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                        >
                          <Key size={14} />
                          Send Both OTP
                        </button>
                        <button
                          onClick={() => handleUpdateLocationSubmit(booking)}
                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                        >
                          <MapPin size={14} />
                          Update Location
                        </button>
                        {booking.subscriptionName &&
                          booking.subscriptionName
                            .toLowerCase()
                            .includes("monthly") && (
                            <>
                              {!["Cancelled", "Completed", "Paused"].includes(
                                booking.status,
                              ) && (
                                <button
                                  onClick={() =>
                                    handlePauseBookingClick(booking)
                                  }
                                  className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                >
                                  <PauseCircle size={14} />
                                  Pause Booking
                                </button>
                              )}
                              <button
                                onClick={() => handleViewPauseHistory(booking)}
                                className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                              >
                                <History size={14} />
                                Pause History
                              </button>
                            </>
                          )}
                        {booking.hasRescheduleHistory && (
                          <button
                            onClick={() => handleViewRescheduleHistory(booking)}
                            className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                          >
                            <Clock size={14} />
                            Reschedule History
                          </button>
                        )}
                        <div className="border-t border-gray-100 my-1"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
  );
};

export default BookingCard;
