import React, { useState } from "react";
import Modal from "../Modal";

const todayInputDate = () => new Date().toISOString().split("T")[0];

const PauseBookingModal = ({
  isPauseModalOpen,
  setIsPauseModalOpen,
  pauseBooking,
  isPausing,
  handlePauseBooking,
}) => {
  const [pauseFrom, setPauseFrom] = useState("");

  const handleClose = () => {
    setIsPauseModalOpen(false);
    setPauseFrom("");
  };

  return (
    <Modal
      isOpen={isPauseModalOpen}
      onClose={handleClose}
      title="Pause Subscription"
      size="md"
    >
      {pauseBooking && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handlePauseBooking({
              pause_from: formData.get("pause_from"),
              pause_until: formData.get("pause_until"),
              reason: formData.get("reason"),
            });
          }}
          className="space-y-6"
        >
          <p className="text-sm text-gray-500">
            Pausing{" "}
            <span className="font-medium text-gray-900">
              {pauseBooking.id}
            </span>{" "}
            for {pauseBooking.customerName}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause From
              </label>
              <input
                type="date"
                name="pause_from"
                min={todayInputDate()}
                value={pauseFrom}
                onChange={(e) => setPauseFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause Until
              </label>
              <input
                type="date"
                name="pause_until"
                min={pauseFrom || todayInputDate()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <textarea
              name="reason"
              rows={3}
              placeholder="e.g. Customer travelling"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPausing}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPausing ? "Pausing..." : "Pause Booking"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default PauseBookingModal;
