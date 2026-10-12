import React, { useState, useEffect, useRef } from "react";
import { Save, Upload, X, ImageOff, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetInstantCardQuery,
  useSaveInstantCardMutation,
  useToggleInstantCardMutation,
} from "../../../api/apiSlice";
import { resolveMediaUrl } from "../../../utils/imageUrl";

const ACTION_TYPES = [
  { value: "category", label: "Category" },
  { value: "screen", label: "Screen" },
  { value: "url", label: "URL" },
];

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  action_type: "category",
  action_value: "",
  is_active: "1",
};

const InstantHelpCard = () => {
  const { data, isLoading } = useGetInstantCardQuery();
  const [saveCard, { isLoading: isSaving }] = useSaveInstantCardMutation();
  const [toggleCard, { isLoading: isToggling }] = useToggleInstantCardMutation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      title: data.title || "",
      subtitle: data.subtitle || "",
      action_type: data.action_type || "category",
      action_value: data.action_value != null ? String(data.action_value) : "",
      is_active: data.is_active != null ? String(Number(data.is_active)) : "1",
    });
    setImageFile(null);
    setImagePreview(data.image || null);
    setImageRemoved(false);
  }, [data]);

  const handleField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleImageFile = (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("subtitle", form.subtitle.trim());
    fd.append("action_type", form.action_type);
    fd.append("action_value", form.action_value.trim());
    fd.append("is_active", form.is_active);
    if (imageFile) {
      fd.append("image", imageFile);
    } else if (imageRemoved) {
      fd.append("image", "");
    }
    try {
      await saveCard(fd).unwrap();
      toast.success("Instant Help Card saved");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    }
  };

  const handleToggle = async () => {
    try {
      await toggleCard().unwrap();
      toast.success("Card visibility toggled");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to toggle");
    }
  };

  const isActive = form.is_active === "1";

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Instant Help Card</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            "Instant Help in 15 Min" banner shown on the app home screen
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick toggle */}
          <button
            onClick={handleToggle}
            disabled={isToggling || !data}
            title={isActive ? "Click to deactivate" : "Click to activate"}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${
              isActive
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
            }`}
          >
            {isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
            {isActive ? "Active" : "Inactive"}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium disabled:opacity-60"
          >
            <Save size={15} />
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left – form fields */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => handleField("title", e.target.value)}
              placeholder="e.g. Instant Help in 15 Min"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Subtitle</label>
            <textarea
              rows={3}
              value={form.subtitle}
              onChange={(e) => handleField("subtitle", e.target.value)}
              placeholder="e.g. Reset, restore helpers for any home service in minutes."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Action type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Action Type</label>
              <select
                value={form.action_type}
                onChange={(e) => handleField("action_type", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Action Value</label>
              <input
                value={form.action_value}
                onChange={(e) => handleField("action_value", e.target.value)}
                placeholder={form.action_type === "category" ? "e.g. 6" : "e.g. /screen or URL"}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select
              value={form.is_active}
              onChange={(e) => handleField("is_active", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>

        {/* Right – image upload */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Card Image</label>
          <div className="relative">
            <div
              className={`w-full aspect-video rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer transition-colors ${
                imagePreview ? "border-gray-200" : "border-gray-200 hover:border-primary/50"
              }`}
              onClick={() => fileRef.current?.click()}
              title="Click to upload image"
            >
              {imagePreview ? (
                <img
                  src={
                    imagePreview.startsWith("blob:")
                      ? imagePreview
                      : resolveMediaUrl(imagePreview)
                  }
                  alt="Card preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <ImageOff size={32} className="opacity-40" />
                  <span className="text-xs">Click to upload image</span>
                </div>
              )}
            </div>

            {/* Remove button */}
            {imagePreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageRemove();
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow"
                title="Remove image"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 flex items-center gap-1.5 text-xs text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
          >
            <Upload size={13} />
            {imagePreview ? "Change Image" : "Upload Image"}
          </button>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP – max 5 MB</p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFile(e.target.files[0])}
          />
        </div>
      </div>
    </div>
  );
};

export default InstantHelpCard;
