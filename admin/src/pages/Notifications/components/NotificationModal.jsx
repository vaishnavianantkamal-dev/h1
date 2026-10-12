import React, { useState, useEffect } from "react";
import { Upload, XCircle, Link2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "../../../components/Modal";
import { resolveMediaUrl } from "../../../utils/imageUrl";
import { useUploadCampaignImageMutation } from "../../../api/apiSlice";
import { SEGMENTS, CATEGORY_PRESETS, isActiveFlag } from "./constants";

const EMPTY = {
  category: "offers",
  title: "",
  body: "",
  segment: "all_customers",
  target_user_id: "",
  is_active: true,
};

const NotificationModal = ({
  isOpen,
  onClose,
  campaign,
  onSave,
  isSaving = false,
}) => {
  const [form, setForm] = useState(EMPTY);
  const [customCategory, setCustomCategory] = useState(false);
  const [imageUrl, setImageUrl] = useState(""); // resolved URL sent to backend
  const [urlInput, setUrlInput] = useState(""); // paste-a-link field

  const [uploadImage, { isLoading: isUploading }] =
    useUploadCampaignImageMutation();

  const isEdit = Boolean(campaign);

  useEffect(() => {
    if (campaign) {
      const preset = CATEGORY_PRESETS.includes(campaign.category);
      setForm({
        category: campaign.category || "",
        title: campaign.title || "",
        body: campaign.body || "",
        segment: campaign.segment || "all_customers",
        target_user_id: campaign.target_user_id ?? "",
        is_active: isActiveFlag(campaign.is_active),
      });
      setCustomCategory(Boolean(campaign.category) && !preset);
      setImageUrl(campaign.image_url || "");
    } else {
      setForm(EMPTY);
      setCustomCategory(false);
      setImageUrl("");
    }
    setUrlInput("");
  }, [campaign, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCategorySelect = (e) => {
    const value = e.target.value;
    if (value === "__custom__") {
      setCustomCategory(true);
      setForm((prev) => ({ ...prev, category: "" }));
    } else {
      setCustomCategory(false);
      setForm((prev) => ({ ...prev, category: value }));
    }
  };

  const handleFile = async (e) => {
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
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await uploadImage(fd).unwrap();
      setImageUrl(res?.image_url || "");
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error?.data?.message || "Image upload failed");
    }
  };

  const applyUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Enter a valid image URL (http/https)");
      return;
    }
    setImageUrl(url);
    setUrlInput("");
  };

  const removeImage = () => setImageUrl("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.category.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.body.trim()) {
      toast.error("Body is required");
      return;
    }
    if (form.segment === "single_user" && !String(form.target_user_id).trim()) {
      toast.error("Target User ID is required for a single user");
      return;
    }

    const values = {
      category: form.category.trim(),
      title: form.title.trim(),
      body: form.body.trim(),
      segment: form.segment,
      image_url: imageUrl || null,
      is_active: Boolean(form.is_active),
    };
    if (form.segment === "single_user") {
      values.target_user_id = Number(form.target_user_id);
    }

    onSave({ values });
  };

  const busy = isSaving || isUploading;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Message" : "New Message"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-start gap-4">
            <label
              htmlFor="campaign-image"
              className="flex-1 cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary rounded-lg p-6 text-center transition-colors"
            >
              <input
                type="file"
                id="campaign-image"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              {isUploading ? (
                <Loader2
                  size={32}
                  className="text-primary mb-2 mx-auto animate-spin"
                />
              ) : (
                <Upload size={32} className="text-gray-400 mb-2 mx-auto" />
              )}
              <span className="text-sm text-gray-600 block">
                {isUploading
                  ? "Uploading..."
                  : `Click to ${imageUrl ? "change" : "upload"} image`}
              </span>
              <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
            </label>
            {imageUrl && (
              <div className="relative">
                <img
                  src={resolveMediaUrl(imageUrl)}
                  alt="Preview"
                  className="w-40 h-24 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.opacity = "0.3";
                  }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  title="Remove image"
                >
                  <XCircle size={14} />
                </button>
              </div>
            )}
          </div>
          {/* Paste a link */}
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Link2
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="...or paste an image URL"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <button
              type="button"
              onClick={applyUrl}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Use URL
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            {customCategory ? (
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Enter category"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            ) : (
              <select
                value={form.category}
                onChange={handleCategorySelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white capitalize"
              >
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
                <option value="__custom__">Other (custom)…</option>
              </select>
            )}
          </div>

          {/* Segment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience <span className="text-red-500">*</span>
            </label>
            <select
              name="segment"
              value={form.segment}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target user id */}
          {form.segment === "single_user" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target User ID <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="target_user_id"
                value={form.target_user_id}
                onChange={handleChange}
                placeholder="e.g. 510"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Up to 50% off!"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Body <span className="text-red-500">*</span>
          </label>
          <textarea
            name="body"
            value={form.body}
            onChange={handleChange}
            rows={3}
            placeholder="Limited time offer, tap to grab it."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          />
        </div>

        {/* Active */}
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
            disabled={busy}
            className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving
              ? "Saving..."
              : isEdit
                ? "Update Message"
                : "Create Message"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NotificationModal;
