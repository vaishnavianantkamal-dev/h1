import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Calendar as CalendarIcon,
  Clock,
  Ban,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";
import Modal from "../../../components/Modal";
import { useGetWorkerBankDetailsByIdQuery } from "../../../api/apiSlice";

const WorkerDetailsModal = ({
  isOpen,
  onClose,
  viewWorker,
  apiServices = [],
  onInitializeDigiLockerKyc,
  onCheckDigiLockerStatus,
  isInitializingDigiLockerKyc = false,
  isCheckingDigiLockerStatus = false,
  digilockerKycData,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAllServices, setShowAllServices] = useState(false);

  const workerId =
    viewWorker?.id || viewWorker?.worker_id || viewWorker?.user_id;
  const { data: bankDetails } = useGetWorkerBankDetailsByIdQuery(workerId, {
    skip: !workerId || !isOpen,
  });

  // Helper to generate unique display name for services
  const getServiceDisplayName = (service) => {
    if (!service) return "";
    const serviceName = typeof service === "object" ? service.name : service;

    if (apiServices.length > 0) {
      const count = apiServices.filter((s) => s.name === serviceName).length;

      // If duplicate names exist
      if (count > 1) {
        // If we have description directly
        if (typeof service === "object" && service.description) {
          return `${serviceName} (${service.description})`;
        }
        // If we have ID, look it up
        if (typeof service === "object" && service.id) {
          const found = apiServices.find(
            (s) => String(s.id) === String(service.id),
          );
          if (found && found.description) {
            return `${serviceName} (${found.description})`;
          }
        }
      }
    }
    return serviceName;
  };

  const availabilityMap = useMemo(() => {
    const map = new Map();
    if (!viewWorker?.availability) return map;

    viewWorker.availability.forEach((slot) => {
      if (slot.available_dates && Array.isArray(slot.available_dates)) {
        slot.available_dates.forEach((dateStr) => {
          if (!map.has(dateStr)) {
            map.set(dateStr, []);
          }
          if (slot.available_times) {
            map.get(dateStr).push(...slot.available_times);
          }
        });
      }
    });
    return map;
  }, [viewWorker]);

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateStr = format(date, "yyyy-MM-dd");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only style dates from today onwards
      if (date >= today) {
        if (availabilityMap.has(dateStr)) {
          // Date is in map -> Available (Green)
          return "!bg-green-500 !text-white font-bold rounded-full hover:!bg-green-600";
        } else {
          // Date is NOT in map -> Unavailable (Red)
          return "!bg-red-100 !text-red-600 font-bold rounded-full hover:!bg-red-200";
        }
      }
    }
    return null;
  };

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const selectedDateAvailability = availabilityMap.get(selectedDateStr);

  const formatDateValue = (value) => {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    return format(parsed, "dd MMM yyyy");
  };

  // Helper to format 24h time to 12h
  const formatTime12 = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return format(date, "hh:mm a");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Worker Details" size="xl">
      {viewWorker && (
        <div className="space-y-6 p-5">
          {/* Header Profile */}
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
            <img
              src={
                viewWorker.avatar ||
                  viewWorker.photo ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  viewWorker.name,
                )}&background=random&color=fff`
              }
              alt={viewWorker.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-gray-50"
            />
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {viewWorker.name}
              </h3>
              <p className="text-gray-500">
                {typeof viewWorker.role === "object"
                  ? viewWorker.role?.name || "Worker"
                  : viewWorker.role || "Worker"}
              </p>
              <div className="flex gap-2 mt-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    viewWorker.kycStatus === "Verified"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : viewWorker.kycStatus === "Rejected"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}
                >
                  {viewWorker.kycStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Information
              </label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-20 text-gray-500">Email:</span>
                  {viewWorker.email || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-20 text-gray-500">Phone:</span>
                  {viewWorker.phone || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-32 text-gray-500">Emergency Contact:</span>
                  {viewWorker.emergency_contact || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-20 text-gray-500">Refer By:</span>
                  {typeof viewWorker.refer_by === "object" ? (
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {viewWorker.refer_by?.firm ||
                          viewWorker.refer_by?.name ||
                          "N/A"}
                      </span>
                      {viewWorker.refer_by?.referral_code && (
                        <span className="text-xs text-gray-400">
                          {viewWorker.refer_by.referral_code}
                        </span>
                      )}
                    </div>
                  ) : (
                    viewWorker.refer_by || "N/A"
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-20 text-gray-500">City:</span>
                  {typeof viewWorker.city === "object"
                    ? viewWorker.city?.name
                    : viewWorker.city || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-20 text-gray-500">Zone:</span>
                  {typeof viewWorker.zone === "object"
                    ? viewWorker.zone?.name
                    : viewWorker.zone || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-20 text-gray-500">Area:</span>
                  {typeof viewWorker.area === "object"
                    ? viewWorker.area?.name
                    : viewWorker.area || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-32 text-gray-500">Joining Date:</span>
                  {viewWorker.date_of_joining || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-32 text-gray-500">Monthly Salary:</span>
                  {viewWorker.monthly_salary
                    ? `₹${viewWorker.monthly_salary}`
                    : "N/A"}
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-32 text-gray-500">Current Address:</span>
                  <span className="flex-1">
                    {viewWorker.current_address || "N/A"}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-32 text-gray-500">Permanent Address:</span>
                  <span className="flex-1">
                    {viewWorker.permanent_address || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Professional Info
              </label>
              <div className="mt-2 space-y-4">
                <div className="text-sm text-gray-700">
                  <span className="text-gray-500 block mb-1">Categories:</span>
                  <div className="flex flex-wrap gap-1">
                    {(
                      (Array.isArray(viewWorker.categories)
                        ? viewWorker.categories
                        : Array.isArray(viewWorker.category)
                          ? viewWorker.category
                          : viewWorker.category
                            ? [viewWorker.category]
                            : []) || []
                    ).map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                      >
                        {typeof c === "object" ? c.name : c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="text-gray-500 block mb-1">Services:</span>
                  <div className="flex flex-wrap gap-1">
                    {viewWorker.services && viewWorker.services.length > 0 ? (
                      <>
                        {(showAllServices
                          ? viewWorker.services
                          : viewWorker.services.slice(0, 6)
                        ).map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs"
                          >
                            {getServiceDisplayName(s)}
                          </span>
                        ))}
                        {viewWorker.services.length > 6 && (
                          <button
                            type="button"
                            onClick={() => setShowAllServices((prev) => !prev)}
                            className="px-2 py-0.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded hover:bg-primary/10 transition-colors"
                          >
                            {showAllServices
                              ? "Show less"
                              : `+${viewWorker.services.length - 6} more`}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">
                        No services listed
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-700">
                  <span className="text-gray-500 block mb-1">
                    Bank Details:
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-32 text-gray-500">
                        Account Holder:
                      </span>
                      <span className="font-medium">
                        {bankDetails?.account_holder_name || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-32 text-gray-500">
                        Account Number:
                      </span>
                      <span className="font-mono">
                        {bankDetails?.account_no || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-32 text-gray-500">Bank Name:</span>
                      <span className="font-medium">
                        {bankDetails?.bank_name || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-32 text-gray-500">IFSC Code:</span>
                      <span className="font-mono">
                        {bankDetails?.ifsc_code || "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Section */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="text-primary" size={20} />
              Availability
            </h4>

            <style>{`
              .react-calendar { 
                border: none; 
                width: 100%;
                background: white;
                font-family: inherit;
              }
              .react-calendar__tile {
                padding: 10px;
                border-radius: 8px;
              }
              .react-calendar__tile--active {
                background: transparent;
                color: inherit;
              }
              .react-calendar__tile--now {
                background: #f3f4f6;
                color: #374151;
              }
              .react-calendar__tile:enabled:hover,
              .react-calendar__tile:enabled:focus {
                background-color: #f3f4f6;
              }
              .react-calendar__navigation button {
                font-size: 1.1rem;
                font-weight: 600;
              }
            `}</style>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
                <Calendar
                  onChange={setSelectedDate}
                  value={selectedDate}
                  tileClassName={tileClassName}
                  className="w-full text-sm border-0 rounded-lg"
                />
              </div>

              <div className="space-y-4">
                <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Schedule for {format(selectedDate, "MMMM d, yyyy")}
                </h5>

                {availabilityMap.has(selectedDateStr) ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm font-medium border border-green-100">
                      <ShieldCheck size={16} />
                      Worker is available on this date
                    </div>

                    <div>
                      <span className="text-xs font-medium text-gray-500 block mb-2 uppercase tracking-wider">
                        Available Time Slots
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedDateAvailability &&
                        selectedDateAvailability.length > 0 ? (
                          selectedDateAvailability.map((time, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 shadow-sm"
                            >
                              <Clock size={14} className="text-primary" />
                              <span>
                                {formatTime12(time.start)} -{" "}
                                {formatTime12(time.end)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-700 shadow-sm w-fit">
                            <Clock size={14} className="text-primary" />
                            <span>All Day</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-red-400 bg-red-50 rounded-xl border-2 border-dashed border-red-200">
                    <Ban size={32} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium text-red-600">
                      Worker is unavailable on this date
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KYC Section */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-primary" size={20} />
              KYC Documents & Verification
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-xs text-gray-500 block mb-1">
                  Aadhaar Number
                </span>
                <span className="font-mono font-medium text-gray-900">
                  {viewWorker.aadhaarNo || "Not provided"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-xs text-gray-500 block mb-1">
                  Police Verification ID
                </span>
                <span className="font-mono font-medium text-gray-900">
                  {viewWorker.policeId || "Not provided"}
                </span>
              </div>
            </div>

            {/* Aadhaar Images */}
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">
                Aadhaar Card
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-medium text-gray-500 block mb-2">
                    Front Side
                  </span>
                  {viewWorker.aadhaarFrontImage ? (
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                      <img
                        src={
                          typeof viewWorker.aadhaarFrontImage === "string"
                            ? viewWorker.aadhaarFrontImage
                            : URL.createObjectURL(viewWorker.aadhaarFrontImage)
                        }
                        alt="Aadhaar Front"
                        className="w-full h-48 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center text-gray-400 text-sm">
                      No Front Image
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 block mb-2">
                    Back Side
                  </span>
                  {viewWorker.aadhaarBackImage ? (
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                      <img
                        src={
                          typeof viewWorker.aadhaarBackImage === "string"
                            ? viewWorker.aadhaarBackImage
                            : URL.createObjectURL(viewWorker.aadhaarBackImage)
                        }
                        alt="Aadhaar Back"
                        className="w-full h-48 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center text-gray-400 text-sm">
                      No Back Image
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Police Verification Images */}
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2">
                Police Verification
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-medium text-gray-500 block mb-2">
                    Front Side
                  </span>
                  {viewWorker.policeFrontImage ? (
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                      <img
                        src={
                          typeof viewWorker.policeFrontImage === "string"
                            ? viewWorker.policeFrontImage
                            : URL.createObjectURL(viewWorker.policeFrontImage)
                        }
                        alt="Police Front"
                        className="w-full h-48 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center text-gray-400 text-sm">
                      No Front Image
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 block mb-2">
                    Back Side
                  </span>
                  {viewWorker.policeBackImage ? (
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                      <img
                        src={
                          typeof viewWorker.policeBackImage === "string"
                            ? viewWorker.policeBackImage
                            : URL.createObjectURL(viewWorker.policeBackImage)
                        }
                        alt="Police Back"
                        className="w-full h-48 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center text-gray-400 text-sm">
                      No Back Image
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Update Action */}
            <div className="mt-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <div className="mb-4 pb-4 border-b border-blue-100">
                <h5 className="font-medium text-gray-900">Aadhaar KYC via DigiLocker</h5>
                <p className="text-xs text-gray-500 mt-1">
                  Start DigiLocker verification to auto-approve KYC when completed.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onInitializeDigiLockerKyc}
                    disabled={isInitializingDigiLockerKyc}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <ExternalLink size={15} />
                    {isInitializingDigiLockerKyc
                      ? "Starting..."
                      : "Start DigiLocker KYC"}
                  </button>
                  <button
                    type="button"
                    onClick={onCheckDigiLockerStatus}
                    disabled={isCheckingDigiLockerStatus}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw size={15} />
                    {isCheckingDigiLockerStatus
                      ? "Checking..."
                      : "Check DigiLocker Status"}
                  </button>
                </div>
                {digilockerKycData?.status && (
                  <div className="mt-3 text-xs text-gray-600">
                    Latest DigiLocker status:{" "}
                    <span className="font-semibold capitalize">
                      {digilockerKycData.status}
                    </span>
                  </div>
                )}
                {(digilockerKycData?.full_name ||
                  digilockerKycData?.aadhaar ||
                  digilockerKycData?.dob ||
                  digilockerKycData?.gender ||
                  digilockerKycData?.address ||
                  digilockerKycData?.verified_at) && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white border border-blue-100 rounded-lg p-3">
                      <span className="text-xs text-gray-500 block mb-1">
                        DigiLocker Name
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {digilockerKycData?.full_name || "N/A"}
                      </span>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-lg p-3">
                      <span className="text-xs text-gray-500 block mb-1">
                        DigiLocker Aadhaar
                      </span>
                      <span className="text-sm font-mono font-medium text-gray-900">
                        {digilockerKycData?.aadhaar || viewWorker.aadhaarNo || "N/A"}
                      </span>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-lg p-3">
                      <span className="text-xs text-gray-500 block mb-1">DOB</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDateValue(digilockerKycData?.dob)}
                      </span>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-lg p-3">
                      <span className="text-xs text-gray-500 block mb-1">Gender</span>
                      <span className="text-sm font-medium text-gray-900">
                        {digilockerKycData?.gender || "N/A"}
                      </span>
                    </div>
                    <div className="md:col-span-2 bg-white border border-blue-100 rounded-lg p-3">
                      <span className="text-xs text-gray-500 block mb-1">
                        DigiLocker Address
                      </span>
                      <span className="text-sm text-gray-900">
                        {digilockerKycData?.address || "N/A"}
                      </span>
                    </div>
                    <div className="bg-white border border-blue-100 rounded-lg p-3">
                      <span className="text-xs text-gray-500 block mb-1">
                        Verified At
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDateValue(digilockerKycData?.verified_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h5 className="font-medium text-gray-900">KYC Status</h5>
                  <p className="text-xs text-gray-500 mt-1">
                    Manual KYC update is disabled. Status is managed by DigiLocker.
                  </p>
                </div>
                <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                  {viewWorker.kycStatus || "Pending"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default WorkerDetailsModal;
