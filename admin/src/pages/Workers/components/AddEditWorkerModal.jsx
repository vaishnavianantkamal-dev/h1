import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  format,
  eachDayOfInterval,
  startOfToday,
  endOfYear,
  addDays,
  startOfYear,
  addYears,
  parseISO,
} from "date-fns";
import Modal from "../../../components/Modal";
import MultiSelect from "../../../components/MultiSelect";

const AddEditWorkerModal = ({
  isOpen,
  onClose,
  isEditMode,
  formData,
  handleInputChange,
  handleCategoryChange,
  handleServiceChange,
  handleFileChange,
  handleSave,
  categoryOptions,
  serviceOptions,
  cities,
  filteredZones,
  filteredServiceableAreas,
  handleDatesChange,
  handleTimesChange,
  referrers = [],
}) => {
  const [tempStartTime, setTempStartTime] = useState("09:00");
  const [tempEndTime, setTempEndTime] = useState("17:00");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (formData.date_of_joining) {
      try {
        const startDate = parseISO(formData.date_of_joining);
        const endDate = addYears(startDate, 1);
        const yearOfDates = eachDayOfInterval({
          start: startDate,
          end: endDate,
        }).map((date) => format(date, "yyyy-MM-dd"));
        handleDatesChange(yearOfDates);
      } catch (error) {
        console.error("Invalid date_of_joining:", error);
        // Optionally, handle the error, e.g., by clearing dates
        handleDatesChange([]);
      }
    }
  }, [formData.date_of_joining]);

  // Helper to format 24h time to 12h
  const formatTime12 = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return format(date, "hh:mm a");
  };

  // Custom Time Selector Component
  const TimeSelector = ({ value, onChange }) => {
    const [h, m] = (value || "12:00").split(":");
    const date = new Date();
    date.setHours(parseInt(h || 0, 10));
    date.setMinutes(parseInt(m || 0, 10));

    const currentHour = format(date, "hh");
    const currentMinute = format(date, "mm");
    const currentAmpm = format(date, "a");

    const handleChange = (type, val) => {
      let newH = parseInt(type === "hour" ? val : currentHour, 10);
      const newM = type === "minute" ? val : currentMinute;
      let newAmpm = type === "ampm" ? val : currentAmpm;

      if (newAmpm === "PM" && newH !== 12) newH += 12;
      if (newAmpm === "AM" && newH === 12) newH = 0;

      onChange(`${newH.toString().padStart(2, "0")}:${newM}`);
    };

    const hours = Array.from({ length: 12 }, (_, i) =>
      (i + 1).toString().padStart(2, "0"),
    );
    const minutes = Array.from({ length: 12 }, (_, i) =>
      (i * 5).toString().padStart(2, "0"),
    );

    return (
      <div className="flex border border-gray-300 rounded-lg overflow-hidden w-full">
        <select
          value={currentHour}
          onChange={(e) => handleChange("hour", e.target.value)}
          className="px-1 py-1.5 text-sm outline-none bg-white border-r border-gray-200 flex-1 min-w-0"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <div className="px-1 py-1.5 text-sm bg-white text-gray-500">:</div>
        <select
          value={currentMinute}
          onChange={(e) => handleChange("minute", e.target.value)}
          className="px-1 py-1.5 text-sm outline-none bg-white border-r border-gray-200 flex-1 min-w-0"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={currentAmpm}
          onChange={(e) => handleChange("ampm", e.target.value)}
          className="px-1 py-1.5 text-sm outline-none bg-gray-50 text-gray-700 font-medium flex-1 min-w-0"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    );
  };

  const toggleDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const currentDates = formData.availableDates || [];
    if (currentDates.includes(dateStr)) {
      handleDatesChange(currentDates.filter((d) => d !== dateStr));
    } else {
      handleDatesChange([...currentDates, dateStr]);
    }
  };

  const addTimeSlot = () => {
    if (tempStartTime && tempEndTime) {
      const newSlot = { start: tempStartTime, end: tempEndTime };
      const currentTimes = formData.availableTimes || [];
      // Check for duplicates (simple check)
      const exists = currentTimes.some(
        (t) => t.start === newSlot.start && t.end === newSlot.end,
      );
      if (!exists) {
        handleTimesChange([...currentTimes, newSlot]);
        setTempStartTime("");
        setTempEndTime("");
      }
    }
  };

  const removeTimeSlot = (index) => {
    const currentTimes = formData.availableTimes || [];
    handleTimesChange(currentTimes.filter((_, i) => i !== index));
  };

  const handleSelectAllYear = () => {
    const today = new Date();
    const firstDayOfYear = startOfYear(today);
    const lastDayOfYear = endOfYear(today);
    const dates = eachDayOfInterval({
      start: firstDayOfYear,
      end: lastDayOfYear,
    }).map((d) => format(d, "yyyy-MM-dd"));
    handleDatesChange(dates);
  };

  const handleSelectNext30Days = () => {
    const today = startOfToday();
    const thirtyDaysLater = addDays(today, 29);
    const dates = eachDayOfInterval({
      start: today,
      end: thirtyDaysLater,
    }).map((d) => format(d, "yyyy-MM-dd"));
    handleDatesChange(dates);
  };

  const handleSelectNext90Days = () => {
    const today = startOfToday();
    const ninetyDaysLater = addDays(today, 89);
    const dates = eachDayOfInterval({
      start: today,
      end: ninetyDaysLater,
    }).map((d) => format(d, "yyyy-MM-dd"));
    handleDatesChange(dates);
  };

  const handleClearAllDates = () => {
    handleDatesChange([]);
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateStr = format(date, "yyyy-MM-dd");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only style dates from today onwards
      if (date >= today) {
        if ((formData.availableDates || []).includes(dateStr)) {
          // Date is selected -> Treated as Available (Green)
          return "!bg-green-500 !text-white font-bold rounded-full hover:!bg-green-600";
        } else {
          // Date is NOT selected -> Treated as Unavailable (Red)
          return "!bg-red-100 !text-red-600 font-bold rounded-full hover:!bg-red-200";
        }
      }
    }
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Worker" : "Add New Worker"}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Full Name"
            />
          </div>
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Email Address"
            />
          </div> */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Phone Number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Contact
            </label>
            <input
              type="text"
              name="emergency_contact"
              value={formData.emergency_contact || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Emergency Contact Number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Joining
            </label>
            <input
              type="date"
              name="date_of_joining"
              value={formData.date_of_joining || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Salary
            </label>
            <input
              type="number"
              name="monthly_salary"
              value={formData.monthly_salary || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Enter Monthly Salary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Address
            </label>
            <textarea
              name="current_address"
              value={formData.current_address || ""}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Enter current address"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permanent Address
            </label>
            <textarea
              name="permanent_address"
              value={formData.permanent_address || ""}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Enter permanent address"
            />
          </div>

          {isEditMode && (
            <>
              <div className="md:col-span-2 mt-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  Bank Details
                </h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  name="account_holder_name"
                  value={formData.account_holder_name || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Enter Account Holder Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="account_no"
                  value={formData.account_no || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Enter Account Number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Enter Bank Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  name="ifsc_code"
                  value={formData.ifsc_code || ""}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Enter IFSC Code"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refer By
            </label>
            <select
              name="refer_by"
              value={formData.refer_by || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              <option value="">Select Referrer</option>
              {referrers.map((referrer) => (
                <option key={referrer.id} value={String(referrer.id)}>
                  {referrer.firm} ({referrer.referral_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <MultiSelect
              label="Categories"
              options={categoryOptions}
              selectedValues={formData.categories}
              onChange={handleCategoryChange}
              placeholder="Select Categories"
            />
          </div>

          <div>
            <MultiSelect
              label="Services"
              options={serviceOptions}
              selectedValues={formData.services}
              onChange={handleServiceChange}
              placeholder="Select Services"
              disabled={formData.categories.length === 0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Availability Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <select
              name="city_id"
              value={formData.city_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              <option value="">Select City</option>
              {cities.map((city) => (
                <option key={city.id} value={String(city.id)}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zone
            </label>
            <select
              name="zone_id"
              value={formData.zone_id}
              onChange={handleInputChange}
              disabled={!formData.city_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Zone</option>
              {filteredZones.map((zone) => (
                <option key={zone.id} value={String(zone.id)}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serviceable Area
            </label>
            <select
              name="serviceable_area_id"
              value={formData.serviceable_area_id}
              onChange={handleInputChange}
              disabled={!formData.zone_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Area</option>
              {filteredServiceableAreas.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none pr-10"
                placeholder={
                  isEditMode
                    ? "Leave blank to keep current or enter new"
                    : "Enter password"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CalendarIcon size={16} className="text-primary" />
                  Select Available Dates
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectNext30Days()}
                    className="text-[10px] px-2 py-1 bg-blue-50 text-primary border border-primary/20 rounded hover:bg-blue-100 transition-colors font-semibold uppercase tracking-wider"
                  >
                    Next 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectNext90Days()}
                    className="text-[10px] px-2 py-1 bg-blue-50 text-primary border border-primary/20 rounded hover:bg-blue-100 transition-colors font-semibold uppercase tracking-wider"
                  >
                    Next 90 Days
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllYear}
                    className="text-[10px] px-2 py-1 bg-blue-50 text-primary border border-primary/20 rounded hover:bg-blue-100 transition-colors font-semibold uppercase tracking-wider"
                  >
                    Select All Year
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllDates}
                    className="text-[10px] px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors font-semibold uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <style>{`
                .react-calendar { border: none; width: 100%; background: white; font-family: inherit; }
                .react-calendar__tile { padding: 10px; border-radius: 8px; }
                .react-calendar__tile--active { background: transparent; color: inherit; }
                .react-calendar__tile--now { background: #f3f4f6; color: #374151; }
                .react-calendar__tile:enabled:hover,
                .react-calendar__tile:enabled:focus { background-color: #f3f4f6; }
              `}</style>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <Calendar
                  onClickDay={toggleDate}
                  tileClassName={tileClassName}
                  className="w-full text-sm border-0 rounded-lg"
                  minDate={new Date()}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Click on dates to toggle availability (Green = Available, Red
                = Unavailable).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Manage Time Slots
              </label>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-full flex flex-col">
                <div className="flex gap-2 mb-4">
                  <div className="w-1/2">
                    <span className="text-xs text-gray-500 block mb-1">
                      Start Time
                    </span>
                    <TimeSelector
                      value={tempStartTime}
                      onChange={setTempStartTime}
                    />
                  </div>
                  <div className="w-1/2">
                    <span className="text-xs text-gray-500 block mb-1">
                      End Time
                    </span>
                    <TimeSelector
                      value={tempEndTime}
                      onChange={setTempEndTime}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addTimeSlot}
                      disabled={!tempStartTime || !tempEndTime}
                      className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-48 space-y-2">
                  {(formData.availableTimes || []).length > 0 ? (
                    (formData.availableTimes || []).map((slot, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {formatTime12(slot.start)} - {formatTime12(slot.end)}
                        </span>
                        <button
                          onClick={() => removeTimeSlot(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No time slots added
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* KYC Section */}
          {isEditMode && (
            <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="text-primary" size={18} />
                KYC Verification Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    name="aadhaarNo"
                    value={formData.aadhaarNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="XXXX-XXXX-XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Police Verification ID
                  </label>
                  <input
                    type="text"
                    name="policeId"
                    value={formData.policeId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Enter ID Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhaar Card (Front)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "aadhaarFrontImage")}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                    />
                    {formData.aadhaarFrontImage && (
                      <div className="mt-2">
                        {typeof formData.aadhaarFrontImage === "string" ? (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={formData.aadhaarFrontImage}
                              alt="Current Aadhaar Front"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} /> New file selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhaar Card (Back)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "aadhaarBackImage")}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                    />
                    {formData.aadhaarBackImage && (
                      <div className="mt-2">
                        {typeof formData.aadhaarBackImage === "string" ? (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={formData.aadhaarBackImage}
                              alt="Current Aadhaar Back"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} /> New file selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Police Verification (Front)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "policeFrontImage")}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                    />
                    {formData.policeFrontImage && (
                      <div className="mt-2">
                        {typeof formData.policeFrontImage === "string" ? (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={formData.policeFrontImage}
                              alt="Current Police Front"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} /> New file selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Police Verification (Back)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "policeBackImage")}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                    />
                    {formData.policeBackImage && (
                      <div className="mt-2">
                        {typeof formData.policeBackImage === "string" ? (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={formData.policeBackImage}
                              alt="Current Police Back"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} /> New file selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-12">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            {isEditMode ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddEditWorkerModal;
