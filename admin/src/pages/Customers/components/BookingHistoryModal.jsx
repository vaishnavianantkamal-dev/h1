import React, { useState } from "react";
import {
  X,
  Calendar,
  User,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  Star,
  MessageSquare,
} from "lucide-react";
import {
  useGetInstantBookingExtensionsQuery,
  useGetWhatsappCoordinatorsMutation,
  useSendBookingToWhatsappCoordinatorMutation,
} from "../../../api/apiSlice";
import { format } from "date-fns";

const BookingHistoryModal = ({ isOpen, onClose, customer }) => {
  const [extensionBookingId, setExtensionBookingId] = useState(null);
  const [activeCoordinatorBookingId, setActiveCoordinatorBookingId] =
    useState(null);
  const [coordinatorsByBooking, setCoordinatorsByBooking] = useState({});
  const [selectedCoordinatorByBooking, setSelectedCoordinatorByBooking] =
    useState({});
  const [statusMessageByBooking, setStatusMessageByBooking] = useState({});
  const [loadingCoordinatorBookingId, setLoadingCoordinatorBookingId] =
    useState(null);
  const [sendingBookingId, setSendingBookingId] = useState(null);
  const { data: instantBooking, isLoading: isLoadingExtensions } =
    useGetInstantBookingExtensionsQuery(extensionBookingId, {
      skip: !extensionBookingId,
    });
  const [getWhatsappCoordinators] = useGetWhatsappCoordinatorsMutation();
  const [sendBookingToWhatsappCoordinator] =
    useSendBookingToWhatsappCoordinatorMutation();

  React.useEffect(() => {
    if (!isOpen) return;
    setExtensionBookingId(null);
    setActiveCoordinatorBookingId(null);
    setCoordinatorsByBooking({});
    setSelectedCoordinatorByBooking({});
    setStatusMessageByBooking({});
    setLoadingCoordinatorBookingId(null);
    setSendingBookingId(null);
  }, [isOpen, customer?.id]);

  // Use bookings from customer object or empty array
  const bookings = customer?.bookings || [];

  const normalizeCoordinatorList = (response) => {
    const rawList =
      response?.coordinators || response?.data?.coordinators || [];
    if (!Array.isArray(rawList)) return [];
    return rawList.map((coordinator) => ({
      id: coordinator?.id,
      name: coordinator?.name || "Unnamed",
      phone: String(coordinator?.phone || "").trim(),
    }));
  };

  const getErrorMessage = (error, fallback) =>
    error?.data?.message || error?.message || fallback;

  const toggleCoordinatorPanel = async (bookingId) => {
    if (activeCoordinatorBookingId === bookingId) {
      setActiveCoordinatorBookingId(null);
      return;
    }

    setActiveCoordinatorBookingId(bookingId);
    setStatusMessageByBooking((prev) => ({ ...prev, [bookingId]: "" }));

    if ((coordinatorsByBooking[bookingId] || []).length > 0) return;

    setLoadingCoordinatorBookingId(bookingId);
    try {
      const response = await getWhatsappCoordinators().unwrap();

      const coordinatorList = normalizeCoordinatorList(response);
      setCoordinatorsByBooking((prev) => ({
        ...prev,
        [bookingId]: coordinatorList,
      }));

      if (coordinatorList.length > 0) {
        setSelectedCoordinatorByBooking((prev) => ({
          ...prev,
          [bookingId]: String(coordinatorList[0].id),
        }));
      } else {
        setStatusMessageByBooking((prev) => ({
          ...prev,
          [bookingId]: "No coordinators found for this booking.",
        }));
      }
    } catch (error) {
      setStatusMessageByBooking((prev) => ({
        ...prev,
        [bookingId]: getErrorMessage(
          error,
          "Could not load coordinators for this booking.",
        ),
      }));
    } finally {
      setLoadingCoordinatorBookingId(null);
    }
  };

  const handleSendWhatsapp = async (bookingId) => {
    const selectedCoordinatorId = selectedCoordinatorByBooking[bookingId];
    if (!selectedCoordinatorId) {
      setStatusMessageByBooking((prev) => ({
        ...prev,
        [bookingId]: "Please select a coordinator first.",
      }));
      return;
    }

    setSendingBookingId(bookingId);
    setStatusMessageByBooking((prev) => ({ ...prev, [bookingId]: "" }));

    try {
      await sendBookingToWhatsappCoordinator({
        coordinator_id: Number(selectedCoordinatorId),
        booking_id: bookingId,
      }).unwrap();

      setStatusMessageByBooking((prev) => ({
        ...prev,
        [bookingId]: "Booking sent successfully on WhatsApp.",
      }));
    } catch (error) {
      setStatusMessageByBooking((prev) => ({
        ...prev,
        [bookingId]: getErrorMessage(
          error,
          "Failed to send booking on WhatsApp.",
        ),
      }));
    } finally {
      setSendingBookingId(null);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Modal Header & Customer Profile */}
        <div className="bg-gray-50/50 border-b border-gray-100">
          <div className="px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              Customer Details
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Customer Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex items-start gap-5">
              <img
                src={customer.avatar}
                alt={customer.name}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {customer.name}
                    </h2>
                    <p className="text-sm text-gray-500 font-mono mt-0.5">
                      {customer.id}
                    </p>
                  </div>
                  {(() => {
                    // Modal header shows the LAST booking's payment status,
                    // not the rolled-up customer one (the customer row in
                    // the table still shows the aggregated status).
                    const rawStatus =
                      customer.lastBookingPaymentStatus ||
                      customer.paymentStatus ||
                      "Pending";
                    const status = rawStatus.toLowerCase();
                    let colorClass = "bg-gray-50 text-gray-700 border-gray-100";

                    if (status === "paid") {
                      colorClass =
                        "bg-green-50 text-green-700 border-green-100";
                    } else if (status === "unpaid" || status === "due") {
                      colorClass = "bg-red-50 text-red-700 border-red-100";
                    } else if (
                      status === "pending" ||
                      status === "payment_pending"
                    ) {
                      colorClass =
                        "bg-yellow-50 text-yellow-700 border-yellow-100";
                    } else if (status === "rejected" || status === "failed") {
                      colorClass = "bg-red-50 text-red-700 border-red-100";
                    }

                    return (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}
                      >
                        {status === "payment_pending"
                          ? "Payment Pending"
                          : rawStatus}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone size={14} className="text-gray-400" />
                      {customer.phone}
                      {customer.isWhatsapp && (
                        <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                          WA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="" title={customer.address}>
                        {customer.address || "No address provided"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar size={14} className="text-gray-400" />
                      Last Booking: {customer.lastBookingDate}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Star
                        size={14}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      Rating: {customer.rating || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Feedback Section if available */}
                {customer.feedback && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <MessageSquare size={14} className="text-blue-500 mt-0.5" />
                    <p className="text-sm text-gray-600 italic">
                      "{customer.feedback}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body - Booking List */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Booking History
            </h4>
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {bookings.length} Bookings
            </span>
          </div>

          <div className="space-y-4">
            {bookings.length === 0 ? (
              <p className="text-center text-gray-500">
                No booking history available.
              </p>
            ) : (
              bookings.map((booking) => {
                const serviceLabel =
                  typeof booking.service === "object"
                    ? booking.service?.name
                    : booking.service || booking.serviceName || "Service";

                const isInstant = String(serviceLabel || "")
                  .toLowerCase()
                  .includes("instant help");

                const isActiveExtensions =
                  extensionBookingId === booking.id && instantBooking;
                const coordinatorList = coordinatorsByBooking[booking.id] || [];
                const selectedCoordinatorId =
                  selectedCoordinatorByBooking[booking.id] || "";
                const selectedCoordinator = coordinatorList.find(
                  (coordinator) =>
                    String(coordinator.id) === String(selectedCoordinatorId),
                );
                const bookingStatusMessage = statusMessageByBooking[booking.id];
                const isCoordinatorPanelOpen =
                  activeCoordinatorBookingId === booking.id;
                const isCoordinatorLoading =
                  loadingCoordinatorBookingId === booking.id;
                const isWhatsappSending = sendingBookingId === booking.id;

                return (
                  <div
                    key={booking.id}
                    className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {serviceLabel}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            NSK-{booking.id}
                          </p>
                          {isInstant && isActiveExtensions && (
                            <p className="mt-1 text-[11px] text-blue-600 flex items-center gap-1">
                              <Clock size={12} />
                              {instantBooking.extension_count} extensions
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${(booking.status || "pending").toLowerCase() ===
                          "completed"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : (booking.status || "pending").toLowerCase() ===
                            "cancelled"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-yellow-50 text-yellow-700 border-yellow-100"
                          }`}
                      >
                        {booking.status || "Pending"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User size={14} className="text-gray-400" />
                        <span>
                          Worker:{" "}
                          <span className="font-medium text-gray-900">
                            {booking.workerName || "Unassigned"}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock size={14} className="text-gray-400" />
                        <span>
                          {booking.booking_date}
                          {booking.time_slot && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({booking.time_slot})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CreditCard size={14} className="text-gray-400" />
                        <span>
                          Amount:{" "}
                          <span className="font-medium text-gray-900">
                            ₹
                            {Number(
                              String(booking.amount).replace(/[^0-9.]/g, "") ||
                              0,
                            ).toFixed(2)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        {(() => {
                          const rawStatus = booking.payment_status || "Pending";
                          const status = rawStatus.toLowerCase();
                          let colorClass =
                            "bg-gray-50 text-gray-700 border-gray-100";

                          if (status === "paid") {
                            colorClass =
                              "bg-green-50 text-green-700 border-green-100";
                          } else if (status === "unpaid" || status === "due") {
                            colorClass =
                              "bg-red-50 text-red-700 border-red-100";
                          } else if (
                            status === "pending" ||
                            status === "payment_pending"
                          ) {
                            colorClass =
                              "bg-yellow-50 text-yellow-700 border-yellow-100";
                          } else if (
                            status === "rejected" ||
                            status === "failed"
                          ) {
                            colorClass =
                              "bg-red-50 text-red-700 border-red-100";
                          }

                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${colorClass}`}
                            >
                              {status === "payment_pending"
                                ? "Payment Pending"
                                : rawStatus}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {booking.address && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
                        <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                        <span className="break-words" title={booking.address}>
                          {booking.address}
                        </span>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <button
                        type="button"
                        onClick={() => toggleCoordinatorPanel(booking.id)}
                        className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <MessageSquare size={12} />
                        {isCoordinatorPanelOpen
                          ? "Hide Coordinator List"
                          : "Send on WhatsApp"}
                      </button>

                      {isCoordinatorPanelOpen && (
                        <div className="mt-2 p-3 bg-green-50/40 border border-green-100 rounded-lg space-y-2">
                          {isCoordinatorLoading ? (
                            <p className="text-xs text-gray-500">
                              Loading coordinators...
                            </p>
                          ) : coordinatorList.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              No coordinators available for this booking.
                            </p>
                          ) : (
                            <>
                              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                Coordinator Phone Number
                              </label>
                              <select
                                value={selectedCoordinatorId}
                                onChange={(e) =>
                                  setSelectedCoordinatorByBooking((prev) => ({
                                    ...prev,
                                    [booking.id]: e.target.value,
                                  }))
                                }
                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary px-3 py-2 outline-none"
                              >
                                {coordinatorList.map((coordinator) => (
                                  <option
                                    key={coordinator.id}
                                    value={String(coordinator.id)}
                                  >
                                    {coordinator.name} - {coordinator.phone}
                                  </option>
                                ))}
                              </select>
                              {selectedCoordinator && (
                                <p className="text-xs text-gray-600">
                                  Selected:{" "}
                                  <span className="font-medium text-gray-900">
                                    {selectedCoordinator.name}
                                  </span>{" "}
                                  ({selectedCoordinator.phone})
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsapp(booking.id)}
                                disabled={isWhatsappSending}
                                className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                              >
                                {isWhatsappSending
                                  ? "Sending..."
                                  : "Send Booking"}
                              </button>
                            </>
                          )}
                          {bookingStatusMessage && (
                            <p className="text-xs text-gray-600">
                              {bookingStatusMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {isInstant && (
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <button
                          type="button"
                          onClick={() =>
                            setExtensionBookingId(
                              extensionBookingId === booking.id
                                ? null
                                : booking.id,
                            )
                          }
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Clock size={12} />
                          {extensionBookingId === booking.id
                            ? "Hide Extensions"
                            : "View Extensions"}
                        </button>

                        {extensionBookingId === booking.id && (
                          <div className="mt-2">
                            {isLoadingExtensions ? (
                              <p className="text-xs text-gray-500">
                                Loading extensions...
                              </p>
                            ) : !instantBooking ||
                              !Array.isArray(instantBooking.extensions) ||
                              instantBooking.extensions.length === 0 ? (
                              <p className="text-xs text-gray-500">
                                No extensions found for this booking.
                              </p>
                            ) : (
                              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto pr-1">
                                {instantBooking.extensions.map((ext) => (
                                  <div
                                    key={ext.id}
                                    className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 rounded-md px-2 py-1"
                                  >
                                    <div className="space-y-0.5">
                                      <p className="font-medium">
                                        #{ext.id} - {ext.duration_minutes} min
                                      </p>
                                      <p className="text-[10px] text-gray-500">
                                        {ext.created_at
                                          ? format(
                                            new Date(ext.created_at),
                                            "yyyy-MM-dd HH:mm",
                                          )
                                          : "Created at: N/A"}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-gray-900">
                                        ₹{Number(ext.amount || 0).toFixed(2)}
                                      </p>
                                      <span
                                        className={`mt-0.5 inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${ext.payment_status === "paid"
                                          ? "bg-green-50 text-green-700 border-green-100"
                                          : "bg-yellow-50 text-yellow-700 border-yellow-100"
                                          }`}
                                      >
                                        {ext.payment_status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingHistoryModal;
