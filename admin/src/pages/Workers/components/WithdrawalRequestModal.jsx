import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useWithdrawWorkerMutation } from "../../../api/apiSlice";

const WithdrawalRequestModal = ({ isOpen, onClose, worker }) => {
  const [amount, setAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [withdrawWorker, { isLoading }] = useWithdrawWorkerMutation();

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setRequestNote("");
    }
  }, [isOpen]);

  if (!isOpen || !worker) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount) {
      toast.error("Please enter an amount");
      return;
    }

    try {
      // The user specified payload: { amount, request_note }
      // Note: This endpoint typically requires the worker's token.
      // Since this is the Admin panel, this request might fail if the backend strictly checks for a Worker token.
      // However, we are sending it as requested.
      const payload = {
        amount: Number(amount),
        request_note: requestNote,
        // We might need to send worker_id if the backend supports it for admins
        // worker_id: worker.id
      };

      await withdrawWorker(payload).unwrap();
      toast.success("Withdrawal request submitted successfully");
      onClose();
    } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error(
        error?.data?.message || "Failed to submit withdrawal request",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Request Withdrawal
            </h2>
            <p className="text-sm text-gray-500 mt-1">For {worker.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Note
            </label>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="e.g. Weekly payout"
              rows="3"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawalRequestModal;
