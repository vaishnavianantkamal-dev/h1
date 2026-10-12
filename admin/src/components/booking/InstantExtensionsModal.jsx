import React from "react";
import { format } from "date-fns";
import Modal from "../Modal";

const InstantExtensionsModal = ({
  isExtensionsModalOpen,
  setIsExtensionsModalOpen,
  setInstantBookingId,
  instantBooking,
  isLoadingExtensions,
}) => {
  return (
      <Modal
        isOpen={isExtensionsModalOpen}
        onClose={() => {
          setIsExtensionsModalOpen(false);
          setInstantBookingId(null);
        }}
        title="Instant Help Extensions"
        size="lg"
      >
        {isLoadingExtensions ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading extensions...
          </div>
        ) : !instantBooking ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No data available.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {instantBooking.service?.name ||
                      "Instant Help - Booking Details"}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    NSK-{instantBooking.id}
                  </p>
                </div>
                <div className="space-y-1 text-xs">
                  <p>
                    Customer:{" "}
                    <span className="font-medium">
                      {instantBooking.customer?.name} (
                      {instantBooking.customer?.phone})
                    </span>
                  </p>
                  <p>
                    Worker:{" "}
                    <span className="font-medium">
                      {instantBooking.worker?.name || "Unassigned"}
                    </span>
                  </p>
                  <p>
                    Base Amount:{" "}
                    <span className="font-medium">
                      ₹{Number(instantBooking.amount || 0).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Extensions ({instantBooking.extension_count || 0})
              </h4>
              {Array.isArray(instantBooking.extensions) &&
              instantBooking.extensions.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {instantBooking.extensions.map((ext) => (
                    <div
                      key={ext.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-white"
                    >
                      <div className="space-y-1 text-sm text-gray-700">
                        <p className="font-medium">
                          Extension #{ext.id} - {ext.duration_minutes} min
                        </p>
                        <p className="text-xs text-gray-500">
                          Created at:{" "}
                          {ext.created_at
                            ? format(
                                new Date(ext.created_at),
                                "yyyy-MM-dd HH:mm",
                              )
                            : "N/A"}
                        </p>
                        {ext.paid_at && (
                          <p className="text-xs text-gray-500">
                            Paid at:{" "}
                            {format(new Date(ext.paid_at), "yyyy-MM-dd HH:mm")}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-gray-900">
                          ₹{Number(ext.amount || 0).toFixed(2)}
                        </p>
                        <p
                          className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            ext.payment_status === "paid"
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-yellow-50 text-yellow-700 border-yellow-100"
                          }`}
                        >
                          {ext.payment_status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No extensions found for this booking.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
  );
};

export default InstantExtensionsModal;
