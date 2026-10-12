import React, { useState } from "react";
import {
  Plus,
  Search,
  Megaphone,
  Edit2,
  Trash2,
  Send,
  BarChart3,
  Users,
  User,
  ImageOff,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import NotificationModal from "./components/NotificationModal";
import SendModal from "./components/SendModal";
import ReportModal from "./components/ReportModal";
import TableSkeleton from "../../components/TableSkeleton";
import { resolveMediaUrl } from "../../utils/imageUrl";
import {
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useToggleCampaignMutation,
  useDeleteCampaignMutation,
} from "../../api/apiSlice";
import { statusMeta, segmentLabel, isActiveFlag } from "./components/constants";

const Notifications = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // modal control: { type: "edit" | "send" | "report", campaign }
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const {
    data: campaigns = [],
    isLoading,
    isFetching,
  } = useGetCampaignsQuery({ status: "draft" });
  const [createCampaign, { isLoading: isCreating }] = useCreateCampaignMutation();
  const [updateCampaign, { isLoading: isUpdating }] = useUpdateCampaignMutation();
  const [toggleCampaign] = useToggleCampaignMutation();
  const [deleteCampaign] = useDeleteCampaignMutation();

  const filtered = campaigns.filter((c) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      c.title?.toLowerCase().includes(term) ||
      c.body?.toLowerCase().includes(term) ||
      c.category?.toLowerCase().includes(term)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setModal({ type: "edit" });
  };

  const openEdit = (campaign) => {
    setEditing(campaign);
    setModal({ type: "edit" });
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };

  // NotificationModal sends { values } with an already-resolved image_url string.
  const handleSave = async ({ values }) => {
    try {
      if (editing) {
        await updateCampaign({ id: editing.id, body: values }).unwrap();
        toast.success("Message updated");
      } else {
        await createCampaign(values).unwrap();
        toast.success("Message created");
      }
      closeModal();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save message");
    }
  };

  const handleToggle = async (campaign) => {
    setTogglingId(campaign.id);
    try {
      await toggleCampaign(campaign.id).unwrap();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (campaign) => {
    if (!window.confirm(`Delete message "${campaign.title}"?`)) return;
    try {
      await deleteCampaign(campaign.id).unwrap();
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete message");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and send push notifications to customers and workers
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search title, body or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span className="font-medium">New Message</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton columns={4} rows={4} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Megaphone size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {searchTerm
              ? "No draft messages match your search."
              : "No draft messages yet. Create your first notification."}
          </p>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${
            isFetching ? "opacity-60" : ""
          }`}
        >
          {filtered.map((campaign) => (
            <MessageCard
              key={campaign.id}
              campaign={campaign}
              toggling={togglingId === campaign.id}
              onToggle={() => handleToggle(campaign)}
              onEdit={() => openEdit(campaign)}
              onDelete={() => handleDelete(campaign)}
              onSend={() => setModal({ type: "send", campaign })}
              onReport={() => setModal({ type: "report", campaign })}
            />
          ))}
        </div>
      )}

      {/* Create / Edit */}
      <NotificationModal
        isOpen={modal?.type === "edit"}
        onClose={closeModal}
        campaign={editing}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      {/* Send */}
      <SendModal
        isOpen={modal?.type === "send"}
        onClose={closeModal}
        campaign={modal?.campaign}
      />

      {/* Delivery report */}
      <ReportModal
        isOpen={modal?.type === "report"}
        onClose={closeModal}
        campaign={modal?.campaign}
      />
    </div>
  );
};

// ---- Card ----------------------------------------------------------------

const MessageCard = ({
  campaign,
  toggling,
  onToggle,
  onEdit,
  onDelete,
  onSend,
  onReport,
}) => {
  const meta = statusMeta(campaign.status);
  const isDraft = campaign.status === "draft";
  const active = isActiveFlag(campaign.is_active);
  const isSingle = campaign.segment === "single_user";
  const showStats = campaign.status === "sent" || campaign.status === "sending";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Image / placeholder */}
      <div className="relative h-40 bg-gradient-to-br from-primary/10 to-blue-100">
        {campaign.image_url ? (
          <img
            src={resolveMediaUrl(campaign.image_url)}
            alt={campaign.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/40">
            <Megaphone size={40} />
          </div>
        )}
        <span
          className={`absolute top-2 right-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        {campaign.category && (
          <span className="self-start inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100 capitalize">
            {campaign.category}
          </span>
        )}
        <h3 className="font-semibold text-gray-900 line-clamp-1">
          {campaign.title || "Untitled"}
        </h3>
        {campaign.body && (
          <p className="text-sm text-gray-500 line-clamp-2">{campaign.body}</p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
          {isSingle ? <User size={14} /> : <Users size={14} />}
          <span>{segmentLabel(campaign.segment)}</span>
          {isSingle && campaign.target_user_id && (
            <span className="text-gray-400">#{campaign.target_user_id}</span>
          )}
        </div>

        {/* Delivery stats (sent / sending) */}
        {showStats && (
          <div className="flex items-center gap-3 text-xs mt-1 pt-2 border-t border-gray-100">
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Users size={13} />
              {campaign.total_recipients ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle2 size={13} />
              {campaign.success_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-red-500">
              <XCircle size={13} />
              {campaign.failure_count ?? 0}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-100">
          {isDraft ? (
            <button
              onClick={onToggle}
              disabled={toggling}
              title={active ? "Deactivate" : "Activate"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${
                active ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          ) : (
            <button
              onClick={onReport}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 size={15} />
              View Report
            </button>
          )}

          <div className="flex items-center gap-1">
            {isDraft && (
              <>
                <button
                  onClick={onSend}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-lg transition-colors"
                  title="Send now"
                >
                  <Send size={14} />
                  Send
                </button>
                <button
                  onClick={onEdit}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
              </>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
