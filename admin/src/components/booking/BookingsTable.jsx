import React from "react";
import {
  MoreVertical,
  Calendar,
  Clock,
  User,
  MapPin,
  Eye,
  Edit,
  CreditCard,
  Key,
  PauseCircle,
  History,
} from "lucide-react";
import {
  getCategoryBadgeStyles,
  getStatusColor,
  getPaymentStatusColor,
} from "../../utils/bookingStatus";
import LocationDisplay from "./LocationDisplay";
import ServiceNameDisplay from "./ServiceNameDisplay";
import WorkerNamesDisplay from "./WorkerNamesDisplay";
import CoordinatorNamesDisplay from "./CoordinatorNamesDisplay";

const BookingsTable = ({
  currentItems,
  filteredBookings,
  activeMenuId,
  setActiveMenuId,
  instantBooking,
  instantBookingId,
  handleShowBookingDetails,
  handleAssignClick,
  handleReassignClick,
  handleAssignCoordinatorClick,
  handleReassignCoordinatorClick,
  handleEditBooking,
  handleSendPaymentLink,
  handleSendBothOtp,
  handleViewExtensions,
  handleViewRescheduleHistory,
  handlePauseBookingClick,
  handleViewPauseHistory,
}) => {
  return (
        <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Coordinator
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Service Started At
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Service Ended At
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="py-8 text-center text-gray-500">
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {booking.id}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {Array.isArray(booking.bookedServices) &&
                          booking.bookedServices.length > 0 ? (
                            <div className="space-y-0.5">
                              {booking.bookedServices.map((svc) => (
                                <div
                                  key={svc.id}
                                  className="flex items-start gap-1.5"
                                >
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
                        {Array.isArray(booking.addons) &&
                          booking.addons.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Add-ons
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {booking.addons.slice(0, 2).map((addon) => (
                                  <span
                                    key={addon.id}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100"
                                  >
                                    {addon.name} x{addon.quantity}
                                  </span>
                                ))}
                                {booking.addons.length > 2 && (
                                  <span className="text-[10px] text-purple-600 font-medium">
                                    +{booking.addons.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        {booking.category && (
                          <div className="mt-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeStyles(
                                booking.category,
                              )}`}
                            >
                              {booking.category}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5 mt-1">
                          {booking.serviceGroup && (
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
                              Group: {booking.serviceGroup}
                            </div>
                          )}
                          {booking.sizeType && (
                            <div className="text-[10px] text-gray-500">
                              Size: {booking.sizeValue} {booking.sizeType}
                            </div>
                          )}
                          {booking.subscriptionName && (
                            <div className="text-[10px] font-semibold text-blue-500">
                              {booking.subscriptionName}
                            </div>
                          )}
                        </div>
                        {booking.serviceType
                          .toLowerCase()
                          .includes("instant help") && (
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
                            className={`mt-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 block`}
                          >
                            Reschedule History
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                            {booking.customerName
                              ? booking.customerName.charAt(0)
                              : "?"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
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
                      </td>
                      <td className="py-4 px-6 min-w-[180px]">
                        <div className="flex flex-col gap-1.5">
                          {booking.workersRequired > 0 && (
                            <span className="inline-flex items-center self-start gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
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
                      </td>
                      <td className="py-4 px-6 min-w-[200px]">
                        <CoordinatorNamesDisplay
                          coordinators={booking.coordinators}
                        />
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(booking.payment_status)}`}
                        >
                          {booking.payment_status === "payment_pending"
                            ? "Payment Pending"
                            : booking.payment_status.charAt(0).toUpperCase() +
                              booking.payment_status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6 min-w-[200px]">
                        <div className="flex items-start gap-1.5 text-sm text-gray-900 max-w-[250px]">
                          <MapPin
                            size={14}
                            className="text-gray-400 mt-1 flex-shrink-0"
                          />
                          <LocationDisplay location={booking.location} />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <Calendar size={14} className="text-gray-400" />
                            {booking.subscriptionStart &&
                            booking.subscriptionEnd
                              ? booking.subscriptionStart ===
                                booking.subscriptionEnd
                                ? booking.subscriptionStart
                                : `${booking.subscriptionStart} \u2192 ${booking.subscriptionEnd}`
                              : booking.date}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={14} className="text-gray-400" />
                            {booking.time}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {booking.serviceStartedAt !== "N/A" ? (
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} className="text-gray-400" />
                              <span>{booking.serviceStartedAt}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {booking.serviceEndedAt !== "N/A" ? (
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} className="text-gray-400" />
                              <span>{booking.serviceEndedAt}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{Number(booking.amount || 0).toFixed(2)}
                        </div>
                        {Number(booking.discountAmount) > 0 && (
                          <div className="text-[11px] text-green-600 whitespace-nowrap">
                            ₹{Number(booking.discountAmount).toFixed(2)}
                            {booking.originalAmount != null && (
                              <span className="text-gray-400 line-through ml-1">
                                ₹{Number(booking.originalAmount).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {booking.serviceType
                            .toLowerCase()
                            .includes("instant help") &&
                            instantBookingId === booking.originalId &&
                            instantBooking?.extension_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                                <Clock size={12} />
                                {instantBooking.extension_count} extensions
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            booking.source === "web"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : booking.source === "mobile"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-blue-50 text-blue-700 border-blue-100" // Default to web styling
                          }`}
                        >
                          {booking.source
                            ? booking.source.charAt(0).toUpperCase() +
                              booking.source.slice(1)
                            : "Web"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
                            className="px-3 py-1.5 bg-white text-indigo-700 border border-indigo-200 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
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
                                className="px-3 py-1.5 bg-white text-primary border border-primary text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                              >
                                Reassign
                              </button>
                            )}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(
                                  activeMenuId === booking.id
                                    ? null
                                    : booking.id,
                                )
                              }
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeMenuId === booking.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleEditBooking(booking)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                  >
                                    <Edit size={14} />
                                    Edit Booking
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSendPaymentLink(booking)
                                    }
                                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                  >
                                    <CreditCard size={14} />
                                    Send Payment Link
                                  </button>
                                  {booking.serviceType
                                    .toLowerCase()
                                    .includes("instant help") && (
                                    <button
                                      onClick={() =>
                                        handleViewExtensions(booking)
                                      }
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
                                          onClick={() =>
                                            handleViewPauseHistory(booking)
                                          }
                                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                        >
                                          <History size={14} />
                                          Pause History
                                        </button>
                                      </>
                                    )}
                                  {/* <button
                                    onClick={() =>
                                      handleUpdateLocationSubmit(booking)
                                    }
                                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                  >
                                    <MapPin size={14} />
                                    Update Location
                                  </button> */}
                                  {booking.hasRescheduleHistory && (
                                    <button
                                      onClick={() =>
                                        handleViewRescheduleHistory(booking)
                                      }
                                      className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                    >
                                      <Clock size={14} />
                                      Reschedule History
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
  );
};

export default BookingsTable;
