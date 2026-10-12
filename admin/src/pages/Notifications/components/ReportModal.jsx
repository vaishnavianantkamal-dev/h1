import React from "react";
import { RefreshCw, Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import Modal from "../../../components/Modal";
import { useGetCampaignStatusQuery } from "../../../api/apiSlice";
import { statusMeta } from "./constants";

const fmtDate = (str) => {
  if (!str) return "—";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ReportModal = ({ isOpen, onClose, campaign }) => {
  const {
    data: report,
    isFetching,
    refetch,
  } = useGetCampaignStatusQuery(campaign?.id, {
    skip: !isOpen || !campaign?.id,
  });

  if (!campaign) return null;

  const status = report?.status ?? campaign.status;
  const meta = statusMeta(status);
  const total = report?.total_recipients ?? campaign.total_recipients ?? 0;
  const success = report?.success_count ?? campaign.success_count ?? 0;
  const failure = report?.failure_count ?? campaign.failure_count ?? 0;
  const sentAt = report?.sent_at ?? campaign.sent_at;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delivery Report" size="md">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-purple-700 font-medium capitalize">
              {campaign.category}
            </p>
            <p className="font-semibold text-gray-900 truncate">
              {campaign.title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-center">
            <Users size={18} className="mx-auto text-gray-400 mb-1" />
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Recipients</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/60 p-4 text-center">
            <CheckCircle2 size={18} className="mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-green-700">{success}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-center">
            <XCircle size={18} className="mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600">{failure}</p>
            <p className="text-xs text-gray-500">Failed</p>
          </div>
        </div>

        {/* Success rate bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Success rate</span>
            <span className="font-medium text-gray-700">{successRate}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* Sent at */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={15} className="text-gray-400" />
          <span>Sent at:</span>
          <span className="font-medium text-gray-800">{fmtDate(sentAt)}</span>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportModal;
