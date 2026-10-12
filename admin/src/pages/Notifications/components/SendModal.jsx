import React, { useState, useEffect } from "react";
import { Send, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../../../components/Modal";
import { useSendCampaignMutation } from "../../../api/apiSlice";
import { SEGMENTS } from "./constants";

const SendModal = ({ isOpen, onClose, campaign }) => {
  const [segment, setSegment] = useState("all_customers");
  const [targetUserId, setTargetUserId] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [sendCampaign, { isLoading }] = useSendCampaignMutation();

  useEffect(() => {
    if (campaign) {
      setSegment(campaign.segment || "all_customers");
      setTargetUserId(campaign.target_user_id ?? "");
      setImageUrl(campaign.image_url || "");
    }
  }, [campaign, isOpen]);

  if (!campaign) return null;

  const handleSend = async () => {
    if (segment === "single_user" && !String(targetUserId).trim()) {
      toast.error("Target User ID is required for a single user");
      return;
    }

    const body = { segment };
    if (segment === "single_user") body.target_user_id = Number(targetUserId);
    if (imageUrl.trim()) body.image_url = imageUrl.trim();

    try {
      const res = await sendCampaign({ id: campaign.id, body }).unwrap();
      toast.success(res?.message || "Campaign queued for sending");
      onClose();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send campaign");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Notification" size="md">
      <div className="space-y-5">
        {/* Preview */}
        <div className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-700 font-medium capitalize">
              {campaign.category}
            </p>
            <p className="font-semibold text-gray-900 truncate">
              {campaign.title}
            </p>
            <p className="text-sm text-gray-500 line-clamp-2">{campaign.body}</p>
          </div>
        </div>

        {/* Segment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Send to <span className="text-red-500">*</span>
          </label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Target user */}
        {segment === "single_user" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target User ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="e.g. 510"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        )}

        {/* Optional image override */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://.../image.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            Once sent, this message becomes delivery history and can no longer be
            edited.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {isLoading ? "Sending..." : "Send Now"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SendModal;
