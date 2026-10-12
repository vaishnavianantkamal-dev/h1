import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  ImageOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import BannerModal from "./BannerModal";
import TableSkeleton from "../../components/TableSkeleton";
import { resolveMediaUrl } from "../../utils/imageUrl";
import {
  useGetBannersQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useToggleBannerMutation,
} from "../../api/apiSlice";

// "2026-06-14T18:30:00.000000Z" -> "2026-06-14"
const toDateOnly = (str) => (str ? String(str).split("T")[0] : "");

// "17:00" -> "17:00:00" (backend expects H:i:s); already-full values pass through.
const withSeconds = (t) => {
  if (!t) return t;
  const s = String(t);
  return s.length === 5 ? `${s}:00` : s;
};

// Build multipart payload from modal values (+ optional image file).
const buildBannerFormData = ({ values, imageFile }) => {
  const fd = new FormData();
  if (imageFile) fd.append("image", imageFile);
  fd.append("title", values.title.trim());
  if (values.subtitle?.trim()) fd.append("subtitle", values.subtitle.trim());
  if (values.placement?.trim()) fd.append("placement", values.placement.trim());
  fd.append("action_type", values.action_type || "none");
  if (
    (values.action_type === "external_url" ||
      values.action_type === "category") &&
    String(values.action_value || "").trim()
  ) {
    fd.append("action_value", String(values.action_value).trim());
  }
  if (values.sort_order !== "" && values.sort_order != null) {
    fd.append("sort_order", values.sort_order);
  }
  if (values.start_date) fd.append("start_date", values.start_date);
  if (values.end_date) fd.append("end_date", values.end_date);
  if (values.start_time) fd.append("start_time", withSeconds(values.start_time));
  if (values.end_time) fd.append("end_time", withSeconds(values.end_time));
  if (values.audience) fd.append("audience", values.audience);
  fd.append("is_active", values.is_active ? 1 : 0);
  return fd;
};

// Build JSON payload for updates without a new image.
const buildBannerJson = ({ values }) => ({
  title: values.title.trim(),
  subtitle: values.subtitle?.trim() || null,
  placement: values.placement?.trim() || null,
  action_type: values.action_type || "none",
  action_value:
    (values.action_type === "external_url" ||
      values.action_type === "category") &&
    String(values.action_value || "").trim()
      ? String(values.action_value).trim()
      : null,
  sort_order:
    values.sort_order === "" || values.sort_order == null
      ? null
      : Number(values.sort_order),
  start_date: values.start_date || null,
  end_date: values.end_date || null,
  start_time: values.start_time ? withSeconds(values.start_time) : null,
  end_time: values.end_time ? withSeconds(values.end_time) : null,
  audience: values.audience || null,
  is_active: Boolean(values.is_active),
});

const Banners = () => {
  const { data: banners = [], isLoading } = useGetBannersQuery();
  const [createBanner, { isLoading: isCreating }] = useCreateBannerMutation();
  const [updateBanner, { isLoading: isUpdating }] = useUpdateBannerMutation();
  const [deleteBanner] = useDeleteBannerMutation();
  const [toggleBanner] = useToggleBannerMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const filtered = banners.filter((b) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      b.title?.toLowerCase().includes(term) ||
      b.placement?.toLowerCase().includes(term)
    );
  });

  const handleAdd = () => {
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  const handleSave = async ({ values, imageFile }) => {
    try {
      if (editingBanner) {
        // Use multipart only when a new image is chosen, else send JSON.
        const body = imageFile
          ? buildBannerFormData({ values, imageFile })
          : buildBannerJson({ values });
        await updateBanner({ id: editingBanner.id, body }).unwrap();
        toast.success("Banner updated successfully");
      } else {
        await createBanner(buildBannerFormData({ values, imageFile })).unwrap();
        toast.success("Banner created successfully");
      }
      setIsModalOpen(false);
      setEditingBanner(null);
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.errors?.image?.[0] ||
          "Failed to save banner",
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await deleteBanner(id).unwrap();
      toast.success("Banner deleted successfully");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete banner");
    }
  };

  const handleToggle = async (id) => {
    setTogglingId(id);
    try {
      const res = await toggleBanner(id).unwrap();
      toast.success(res?.message || "Status updated");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage dynamic banners shown in the app
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
              placeholder="Search by title or placement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span className="font-medium">Add Banner</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton columns={4} rows={4} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <ImageOff size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {searchTerm ? "No banners match your search." : "No banners yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((banner) => {
            const isActive =
              banner.is_active === true ||
              banner.is_active === 1 ||
              banner.is_active === "1";
            return (
              <div
                key={banner.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Image */}
                <div className="relative h-40 bg-gray-50">
                  {banner.image_url ? (
                    <img
                      src={resolveMediaUrl(banner.image_url)}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageOff size={32} />
                    </div>
                  )}
                  <span
                    className={`absolute top-2 right-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${
                      isActive
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {isActive ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {banner.title || "Untitled"}
                    </h3>
                    {banner.placement && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {banner.placement}
                      </span>
                    )}
                  </div>
                  {banner.subtitle && (
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {banner.subtitle}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100">
                      Order: {banner.sort_order ?? 0}
                    </span>
                    {banner.action_type && banner.action_type !== "none" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                        {banner.action_type}
                      </span>
                    )}
                    {banner.action_type === "external_url" &&
                      banner.action_value && (
                        <a
                          href={banner.action_value}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline truncate max-w-[140px]"
                        >
                          <ExternalLink size={12} />
                          Link
                        </a>
                      )}
                  </div>

                  {(banner.start_date || banner.end_date) && (
                    <p className="text-xs text-gray-400">
                      {toDateOnly(banner.start_date) || "—"} →{" "}
                      {toDateOnly(banner.end_date) || "—"}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-100">
                    {/* Toggle switch */}
                    <button
                      onClick={() => handleToggle(banner.id)}
                      disabled={togglingId === banner.id}
                      title={isActive ? "Deactivate" : "Activate"}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${
                        isActive ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
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
          })}
        </div>
      )}

      <BannerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBanner(null);
        }}
        banner={editingBanner}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};

export default Banners;
