import React, { useState, useEffect, useRef } from "react";
import { Save, Upload, X, ImageOff, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetSavingsBannerQuery,
  useSaveSavingsBannerMutation,
} from "../../../api/apiSlice";
import { resolveMediaUrl } from "../../../utils/imageUrl";

let _keyCounter = 0;
const newKey = () => ++_keyCounter;

const EMPTY_FORM = {
  title: "",
  subtitle: "",
  is_active: "1",
};

const SavingsBanner = () => {
  const { data, isLoading } = useGetSavingsBannerQuery();
  const [saveBanner, { isLoading: isSaving }] = useSaveSavingsBannerMutation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    setForm({
      title: data.title || "",
      subtitle: data.subtitle || "",
      is_active: data.is_active != null ? String(Number(data.is_active)) : "1",
    });

    // Initialize existing images
    const existingImages = Array.isArray(data.images) ? data.images : [];
    setImages(
      existingImages.map((img) => ({
        _key: newKey(),
        file: null,
        preview: img,
        isNew: false,
      })),
    );
    setRemoveImages([]);
  }, [data]);

  const handleField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleImageFile = (file) => {
    if (!file) return;
    setImages((prev) => [
      ...prev,
      {
        _key: newKey(),
        file,
        preview: URL.createObjectURL(file),
        isNew: true,
      },
    ]);
  };

  const handleRemoveImage = (idx) => {
    const image = images[idx];
    // If it's an existing image (has URL preview), mark it for removal
    if (!image.isNew && image.preview) {
      setRemoveImages((prev) => [...prev, image.preview]);
    }
    // Remove from display
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (images.length === 0)
      return toast.error("At least one image is required");

    const fd = new FormData();
    fd.append("title", form.title.trim() || "");
    fd.append("subtitle", form.subtitle.trim() || "");
    fd.append("is_active", form.is_active);

    // Add new image files
    let imageCount = 0;
    images.forEach((img) => {
      if (img.file) {
        fd.append(`images[${imageCount}]`, img.file);
        imageCount++;
      }
    });

    // Add images to remove
    removeImages.forEach((url, idx) => {
      fd.append(`remove_images[${idx}]`, url);
    });

    try {
      await saveBanner(fd).unwrap();
      toast.success("Savings banner saved");
      setRemoveImages([]);
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
          <h2 className="text-xl font-bold text-gray-900">
            Savings Banner Gallery
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage savings promotion banner images
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

      {/* Form fields */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Title
          </label>
          <input
            value={form.title}
            onChange={(e) => handleField("title", e.target.value)}
            placeholder="e.g. Save More"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Subtitle
          </label>
          <textarea
            rows={2}
            value={form.subtitle}
            onChange={(e) => handleField("subtitle", e.target.value)}
            placeholder="e.g. Get special discounts on your first booking"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          />
        </div>

        {/* Status */}
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Total Images: {images.length}
            </label>
            <div className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
              {images.length} image{images.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-xs font-medium text-gray-600">
            Banner Images <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <Plus size={14} /> Add Image
          </button>
        </div>

        {images.length === 0 ? (
          <div
            className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <ImageOff size={32} className="opacity-40" />
              <span className="text-xs">Click to upload first image</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <div key={img._key} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={
                      img.preview.startsWith("blob:")
                        ? img.preview
                        : resolveMediaUrl(img.preview)
                    }
                    alt={`Gallery item ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow"
                  title="Remove image"
                >
                  <Trash2 size={12} />
                </button>

                {/* Badge */}
                {img.isNew && (
                  <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
                    New
                  </div>
                )}
              </div>
            ))}

            {/* Add new image card */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <Upload size={20} />
                <span className="text-xs">Add</span>
              </div>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          Array.from(e.target.files || []).forEach((file) => {
            handleImageFile(file);
          });
          // Reset input so same file can be selected again
          if (fileRef.current) fileRef.current.value = "";
        }}
      />

      {/* Info text */}
      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
        <p>
          💡 <strong>Gallery Pattern:</strong> New images will be appended.
          Removed images will be deleted from storage. Title and subtitle are
          optional.
        </p>
      </div>
    </div>
  );
};

export default SavingsBanner;
