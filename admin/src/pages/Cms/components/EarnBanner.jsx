import React, { useState, useEffect, useRef } from "react";
import { Save, Upload, X, ImageOff } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetEarnBannerQuery,
  useSaveEarnBannerMutation,
} from "../../../api/apiSlice";
import { resolveMediaUrl } from "../../../utils/imageUrl";

const EMPTY_FORM = {
  title: "",
  amount: "",
  currency_symbol: "₹",
  subtitle: "",
  action_url: "",
  is_active: "1",
};

const EarnBanner = () => {
  const { data, isLoading } = useGetEarnBannerQuery();
  const [saveBanner, { isLoading: isSaving }] = useSaveEarnBannerMutation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [iconRemoved, setIconRemoved] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      title: data.title || "",
      amount: data.amount != null ? String(data.amount) : "",
      currency_symbol: data.currency_symbol || "₹",
      subtitle: data.subtitle || "",
      action_url: data.action_url || "",
      is_active: data.is_active != null ? String(Number(data.is_active)) : "1",
    });
    setIconFile(null);
    setIconPreview(data.icon || null);
    setIconRemoved(false);
  }, [data]);

  const handleField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleIconFile = (file) => {
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
    setIconRemoved(false);
  };

  const handleIconRemove = () => {
    setIconFile(null);
    setIconPreview(null);
    setIconRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.amount.trim()) return toast.error("Amount is required");
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("amount", form.amount.trim());
    fd.append("currency_symbol", form.currency_symbol.trim());
    fd.append("subtitle", form.subtitle.trim());
    fd.append("action_url", form.action_url.trim());
    fd.append("is_active", form.is_active);
    if (iconFile) {
      fd.append("icon", iconFile);
    } else if (iconRemoved) {
      fd.append("icon", "");
    }
    try {
      await saveBanner(fd).unwrap();
      toast.success("Earn banner saved");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    }
  };

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
          <h2 className="text-xl font-bold text-gray-900">Earn Banner</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            "Earn ₹20" referral banner shown on the app home screen
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium disabled:opacity-60 shrink-0"
        >
          <Save size={15} />
          {isSaving ? "Saving…" : "Save"}
        </button>
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
              placeholder="e.g. Earn"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleField("amount", e.target.value)}
                placeholder="e.g. 20"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Currency Symbol
              </label>
              <input
                value={form.currency_symbol}
                onChange={(e) => handleField("currency_symbol", e.target.value)}
                placeholder="e.g. ₹"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Subtitle
            </label>
            <textarea
              rows={3}
              value={form.subtitle}
              onChange={(e) => handleField("subtitle", e.target.value)}
              placeholder="e.g. Refer a friend and earn rewards"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Action URL */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Action URL
            </label>
            <input
              value={form.action_url}
              onChange={(e) => handleField("action_url", e.target.value)}
              placeholder="e.g. /refer or https://…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Status
            </label>
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

        {/* Right – icon upload */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Banner Icon
          </label>
          <div className="relative">
            <div
              className={`w-full aspect-video rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer transition-colors ${
                iconPreview ? "border-gray-200" : "border-gray-200 hover:border-primary/50"
              }`}
              onClick={() => fileRef.current?.click()}
              title="Click to upload icon"
            >
              {iconPreview ? (
                <img
                  src={
                    iconPreview.startsWith("blob:")
                      ? iconPreview
                      : resolveMediaUrl(iconPreview)
                  }
                  alt="Icon preview"
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <ImageOff size={32} className="opacity-40" />
                  <span className="text-xs">Click to upload icon</span>
                </div>
              )}
            </div>

            {/* Remove button */}
            {iconPreview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIconRemove();
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow"
                title="Remove icon"
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
            {iconPreview ? "Change Icon" : "Upload Icon"}
          </button>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP – max 5 MB</p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleIconFile(e.target.files[0])}
          />
        </div>
      </div>
    </div>
  );
};

export default EarnBanner;
