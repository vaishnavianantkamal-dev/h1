import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save, Upload, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetSubscriptionBenefitsQuery,
  useBulkSaveSubscriptionBenefitsMutation,
  useDeleteSubscriptionBenefitMutation,
} from "../../../api/apiSlice";
import { resolveMediaUrl } from "../../../utils/imageUrl";

let _keyCounter = 0;
const newKey = () => ++_keyCounter;

const SubscriptionBenefits = () => {
  const [serviceType, setServiceType] = useState("cleaner");
  const { data, isLoading } = useGetSubscriptionBenefitsQuery({
    type: serviceType,
  });
  const [bulkSave, { isLoading: isSaving }] =
    useBulkSaveSubscriptionBenefitsMutation();
  const [deleteBenefit] = useDeleteSubscriptionBenefitMutation();

  const [heading, setHeading] = useState("");
  const [isActive, setIsActive] = useState("1");
  const [items, setItems] = useState([]);
  const fileRefs = useRef({});

  useEffect(() => {
    if (!data) return;
    setHeading(data.heading || "");
    setIsActive(data.is_active != null ? String(Number(data.is_active)) : "1");
    setItems(
      (data.benefits || []).map((b) => ({
        _key: newKey(),
        id: b.id,
        title: b.title || "",
        iconFile: null,
        iconPreview: b.icon || null,
      })),
    );
  }, [data]);

  const updateItem = (idx, patch) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleIconChange = (idx, file) => {
    if (!file) return;
    updateItem(idx, {
      iconFile: file,
      iconPreview: URL.createObjectURL(file),
      iconRemoved: false,
    });
  };

  const handleDelete = async (idx) => {
    const item = items[idx];
    if (item.id) {
      if (!window.confirm("Delete this benefit?")) return;
      try {
        await deleteBenefit(item.id).unwrap();
        toast.success("Benefit deleted");
      } catch {
        toast.error("Failed to delete");
        return;
      }
    }
    setItems((p) => p.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!heading.trim()) return toast.error("Heading is required");
    const fd = new FormData();
    fd.append("heading", heading.trim());
    fd.append("is_active", isActive);
    fd.append("type", serviceType);
    items.forEach((item, n) => {
      if (item.id) fd.append(`item_id[${n}]`, String(item.id));
      fd.append(`title[${n}]`, item.title);
      if (item.iconFile) {
        fd.append(`icon[${n}]`, item.iconFile);
      } else if (item.iconRemoved) {
        fd.append(`icon[${n}]`, "");
      }
    });
    try {
      await bulkSave({ formData: fd, type: serviceType }).unwrap();
      toast.success("Subscription Benefits saved");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Subscription Benefits
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Benefits displayed on the app subscription screen
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium disabled:opacity-60 shrink-0"
        >
          <Save size={15} />
          {isSaving ? "Saving…" : "Save All"}
        </button>
      </div>

      {/* Service Type Selector */}
      <div className="flex gap-2">
        {["cleaner", "cook"].map((type) => (
          <button
            key={type}
            onClick={() => setServiceType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              serviceType === type
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Section meta */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Section Heading <span className="text-red-500">*</span>
          </label>
          <input
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="e.g. Subscription Benefits"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Status
          </label>
          <select
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No benefits yet. Click "Add Benefit" to get started.
          </p>
        )}
        {items.map((item, idx) => (
          <div
            key={item._key}
            className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
          >
            {/* Icon upload */}
            <div className="relative shrink-0">
              <div
                className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRefs.current[idx]?.click()}
                title="Click to upload icon"
              >
                {item.iconPreview ? (
                  <img
                    src={
                      item.iconPreview.startsWith("blob:")
                        ? item.iconPreview
                        : resolveMediaUrl(item.iconPreview)
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload size={16} className="text-gray-300" />
                )}
              </div>
              {item.iconPreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateItem(idx, {
                      iconFile: null,
                      iconPreview: null,
                      iconRemoved: true,
                    });
                    if (fileRefs.current[idx]) fileRefs.current[idx].value = "";
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                  title="Remove image"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <input
              ref={(el) => (fileRefs.current[idx] = el)}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleIconChange(idx, e.target.files[0])}
            />

            {/* Title */}
            <input
              value={item.title}
              onChange={(e) => updateItem(idx, { title: e.target.value })}
              placeholder="Benefit title…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />

            {/* Delete */}
            <button
              onClick={() => handleDelete(idx)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Add */}
      <button
        onClick={() =>
          setItems((p) => [
            ...p,
            {
              _key: newKey(),
              id: null,
              title: "",
              iconFile: null,
              iconPreview: null,
            },
          ])
        }
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        <Plus size={16} /> Add Benefit
      </button>
    </div>
  );
};

export default SubscriptionBenefits;
