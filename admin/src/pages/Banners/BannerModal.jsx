import React, { useState, useEffect } from "react";
import { Upload, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../../components/Modal";
import { getImageUrl } from "../../utils/imageUrl";
import { useGetServiceCategoriesQuery } from "../../api/apiSlice";

const EMPTY = {
  title: "",
  subtitle: "",
  placement: "home_top",
  action_type: "none",
  action_value: "",
  sort_order: "",
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  audience: "all_users",
  is_active: true,
};

const ACTION_TYPES = [
  { value: "none", label: "None" },
  { value: "external_url", label: "External URL" },
  { value: "category", label: "Category" },
];

const AUDIENCE_OPTIONS = [
  { value: "all_users", label: "All Users" },
  { value: "new_user", label: "New User" },
  { value: "member", label: "Member" },
];

// "2026-06-14T18:30:00.000000Z" -> "2026-06-14" (for <input type="date">)
const toDateOnly = (str) => (str ? String(str).split("T")[0] : "");

// "17:00:00" -> "17:00" (for <input type="time">)
const toHHMM = (str) => (str ? String(str).slice(0, 5) : "");

const BannerModal = ({ isOpen, onClose, banner, onSave, isLoading = false }) => {
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const { data: categories = [] } = useGetServiceCategoriesQuery();

  const isEdit = Boolean(banner);

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title || "",
        subtitle: banner.subtitle || "",
        placement: banner.placement || "home_top",
        action_type: banner.action_type || "none",
        action_value: banner.action_value || "",
        sort_order: banner.sort_order ?? "",
        start_date: toDateOnly(banner.start_date),
        end_date: toDateOnly(banner.end_date),
        start_time: toHHMM(banner.start_time),
        end_time: toHHMM(banner.end_time),
        audience: banner.audience || "all_users",
        is_active:
          banner.is_active === true ||
          banner.is_active === 1 ||
          banner.is_active === "1",
      });
      setImagePreview(banner.image_url || "");
    } else {
      setForm(EMPTY);
      setImagePreview("");
    }
    setImageFile(null);
  }, [banner, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(isEdit ? banner?.image_url || "" : "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!isEdit && !imageFile) {
      toast.error("Banner image is required");
      return;
    }
    if (form.action_type === "external_url" && !form.action_value.trim()) {
      toast.error("Action value (URL) is required for External URL");
      return;
    }
    if (form.action_type === "category" && !form.action_value) {
      toast.error("Category is required for Category action type");
      return;
    }

    onSave({ values: form, imageFile });
  };

  const showActionValue =
    form.action_type === "external_url" || form.action_type === "category";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Banner" : "Add New Banner"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Banner Image {!isEdit && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-start gap-4">
            <label
              htmlFor="banner-image"
              className="flex-1 cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary rounded-lg p-6 text-center transition-colors"
            >
              <input
                type="file"
                id="banner-image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Upload size={32} className="text-gray-400 mb-2 mx-auto" />
              <span className="text-sm text-gray-600 block">
                Click to {imagePreview ? "change" : "upload"} image
              </span>
              <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
            </label>
            {imagePreview && (
              <div className="relative">
                <img
                  src={imageFile ? imagePreview : getImageUrl(imagePreview)}
                  alt="Banner preview"
                  className="w-40 h-24 object-cover rounded-lg border border-gray-200"
                />
                {imageFile && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    title="Remove selected image"
                  >
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g. Monsoon Mega Sale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtitle
            </label>
            <input
              type="text"
              name="subtitle"
              value={form.subtitle}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placement
            </label>
            <input
              type="text"
              name="placement"
              value={form.placement}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g. home_top"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <input
              type="number"
              name="sort_order"
              value={form.sort_order}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              name="action_type"
              value={form.action_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          {showActionValue && form.action_type === "category" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="action_value"
                value={form.action_value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showActionValue && form.action_type === "external_url" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Value (URL) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="action_value"
                value={form.action_value}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="https://hobit.club/offers"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="end_date"
              value={form.end_date}
              min={form.start_date || undefined}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              name="end_time"
              value={form.end_time}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience
            </label>
            <select
              name="audience"
              value={form.audience}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          Active
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : isEdit ? "Update Banner" : "Create Banner"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BannerModal;
