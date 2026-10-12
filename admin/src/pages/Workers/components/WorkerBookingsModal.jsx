import React from "react";
import Modal from "../../../components/Modal";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Tag,
  CheckCircle2,
  XCircle,
  ExternalLink,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { useGetWorkerBookingsQuery } from "../../../api/apiSlice";

const WorkerBookingsModal = ({ isOpen, onClose, workerId }) => {
  const { data, isLoading } = useGetWorkerBookingsQuery(workerId, {
    skip: !workerId || !isOpen,
  });

  const worker = data?.worker;
  const bookings = data?.data || [];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Booking History - ${worker?.name || "Worker"}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Worker Summary Header */}
        {worker && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                {(worker.name || "W").charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{worker.name}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <History size={12} /> {bookings.length} Total Bookings
                  </span>
                  <span className="flex items-center gap-1">
                    Wallet: ₹{worker.wallet_balance || "0.00"}
                  </span>
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 size={12} /> {worker.jobs_completed || 0} Jobs
                    Done
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 font-medium">
                Loading booking history...
              </p>
            </div>
          ) : bookings.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          booking.status === "completed"
                            ? "bg-green-50 text-green-600"
                            : booking.status === "cancelled"
                              ? "bg-red-50 text-red-600"
                              : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {booking.status === "completed" ? (
                          <CheckCircle2 size={18} />
                        ) : booking.status === "cancelled" ? (
                          <XCircle size={18} />
                        ) : (
                          <Clock size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 capitalize">
                          {booking.bot_payload?.service || "Service Details"}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          ID: #{booking.id} • {booking.status}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ₹{booking.amount}
                      </p>
                      <p
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block ${
                          booking.payment_status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {booking.payment_status}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-t border-gray-50">
                    <div className="flex items-start gap-2">
                      <User size={14} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                          Customer
                        </p>
                        <p className="text-xs font-medium text-gray-700">
                          {booking.customer_name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {booking.customer_phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar size={14} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                          Schedule
                        </p>
                        <p className="text-xs font-medium text-gray-700">
                          {booking.booking_date}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {booking.time_slot}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                          Address
                        </p>
                        <p
                          className="text-xs font-medium text-gray-700 truncate max-w-[150px]"
                          title={booking.address}
                        >
                          {booking.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {booking.razorpay_payment_url && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag size={12} className="text-gray-400" />
                        <span className="text-[10px] text-gray-500 font-medium">
                          Source: {booking.source}
                        </span>
                      </div>
                      <a
                        href={booking.razorpay_payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        Payment Receipt <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50">
              <History size={40} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400 font-medium">
                No booking history found
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default WorkerBookingsModal;
