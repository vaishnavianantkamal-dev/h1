import React, { useState, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  ImageOff,
  Upload,
  Check,
  Ban,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetHomeCategoriesQuery,
  useCreateHomeCategoryMutation,
  useUpdateHomeCategoryMutation,
  useDeleteHomeCategoryMutation,
} from "../../../api/apiSlice";
import { resolveMediaUrl } from "../../../utils/imageUrl";

const EMPTY_FORM = {
  name: "",
  slug: "",
  note: "",
  status: "1",
  sort_order: "0",
  dos: [""],
  donts: [""],
};

const toSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// images can be strings or objects depending on the API; normalize to {id, url, path}
// path = stored path the backend expects in remove_images[] (e.g. home_categories/abc.jpg)
const imageObjects = (cat) => {
  const list = Array.isArray(cat?.images)
    ? cat.images
    : Array.isArray(cat?.image_urls)
      ? cat.image_urls
      : [];

  const objs = list
    .map((img) =>
      typeof img === "string"
        ? { id: null, url: img, path: img }
        : {
            id: img?.id ?? null,
            url: img?.url || img?.image_url || img?.path || img?.image,
            path: img?.path || img?.image || img?.url || img?.image_url,
          },
    )
    .filter((o) => o.url);

  if (objs.length === 0 && (cat?.icon || cat?.image_url)) {
    const fallback = cat.icon || cat.image_url;
    objs.push({ id: null, url: fallback, path: fallback });
  }

  return objs;
};

// Strip origin and /storage/ prefix so an absolute URL becomes the stored path
const toStoragePath = (value) => {
  if (!value) return value;
  let p = value;
  try {
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    // keep value as-is if it isn't a valid URL
  }
  p = p.replace(/^\/+/, "");
  if (p.startsWith("public/storage/")) {
    return p.replace(/^public\/storage\//, "");
  }
  return p.replace(/^storage\/+/, "");
};

const imageUrls = (cat) => imageObjects(cat).map((o) => o.url);

const ListEditor = ({ label, icon: Icon, color, items, onChange }) => {
  const add = () => onChange([...items, ""]);
  const update = (i, val) =>
    onChange(items.map((v, idx) => (idx === i ? val : v)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`${label} item…`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
        >
          <Plus size={13} /> Add item
        </button>
      </div>
    </div>
  );
};

const CategoryModal = ({ isOpen, onClose, category, onSave, isLoading }) => {
  const fileRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newFiles, setNewFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);

  const getDosDonts = (categoryData) => {
    const items = Array.isArray(categoryData?.dos_donts)
      ? categoryData.dos_donts
      : [];

    return {
      dos: Array.isArray(categoryData?.dos)
        ? categoryData.dos
        : items
            .filter((item) => item.type === "do")
            .map((item) => item.text || ""),
      donts: Array.isArray(categoryData?.donts)
        ? categoryData.donts
        : items
            .filter((item) => item.type === "dont")
            .map((item) => item.text || ""),
    };
  };

  React.useEffect(() => {
    if (!isOpen) return;
    if (category) {
      const { dos, donts } = getDosDonts(category);
      setForm({
        name: category.name || "",
        slug: category.slug || "",
        note: category.note || "",
        status: String(Number(category.status ?? 1)),
        sort_order: String(category.sort_order ?? 0),
        dos: dos.length ? dos : [""],
        donts: donts.length ? donts : [""],
      });
      setExistingImages(imageObjects(category));
    } else {
      setForm(EMPTY_FORM);
      setExistingImages([]);
    }
    setNewFiles([]);
    setRemovedImages([]);
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeNewFile = (index) =>
    setNewFiles((prev) => prev.filter((_, i) => i !== index));

  const removeExistingImage = (index) => {
    const img = existingImages[index];
    if (!img) return;
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setRemovedImages((prev) => {
      const key = img.id ?? img.url;
      return prev.some((r) => (r.id ?? r.url) === key) ? prev : [...prev, img];
    });
  };

  const handleNameChange = (name) => {
    setForm((f) => ({
      ...f,
      name,
      slug: category ? f.slug : toSlug(name),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");

    const fd = new FormData();
    fd.append("name", form.name.trim());
    fd.append("slug", form.slug.trim() || toSlug(form.name));
    fd.append("note", form.note.trim());
    fd.append("status", form.status);
    fd.append("sort_order", form.sort_order);
    newFiles.forEach((file, i) => fd.append(`images[${i}]`, file));
    removedImages.forEach((img) =>
      fd.append("remove_images[]", toStoragePath(img.path || img.url)),
    );

    const filteredDos = form.dos.filter((d) => d.trim());
    const filteredDonts = form.donts.filter((d) => d.trim());
    filteredDos.forEach((d, i) => fd.append(`dos[${i}]`, d.trim()));
    filteredDonts.forEach((d, i) => fd.append(`donts[${i}]`, d.trim()));

    onSave(fd);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {category ? "Edit Category" : "Add Category"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto p-6 space-y-5 flex-1"
        >
          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images
            </label>
            <div className="flex flex-wrap items-start gap-3">
              {existingImages.map((img, i) => (
                <div
                  key={`existing-${img.id ?? img.url}`}
                  className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shrink-0"
                  title="Existing image"
                >
                  <img
                    src={resolveMediaUrl(img.url)}
                    alt={`image ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow"
                    title="Remove image"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {newFiles.map((file, i) => (
                <div
                  key={`new-${i}`}
                  className="relative w-20 h-20 rounded-xl border-2 border-dashed border-primary/40 overflow-hidden bg-gray-50 shrink-0"
                  title={file.name}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow"
                    title="Remove"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {existingImages.length === 0 && newFiles.length === 0 && (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 shrink-0">
                  <ImageOff size={24} className="text-gray-300" />
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <Upload size={14} /> Add Image{newFiles.length > 0 ? "s" : ""}
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, WEBP – max 4 MB each
                  {category
                    ? "; new images are added to the existing ones"
                    : ""}
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>

          {/* Name + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. House Cleaning"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="e.g. house-cleaning"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Note
            </label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Please provide all necessary equipment for the expert"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Sort Order + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sort Order
              </label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>

          {/* Dos & Donts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <ListEditor
              label="Included (Dos)"
              icon={Check}
              color="text-green-600"
              items={form.dos}
              onChange={(dos) => setForm((f) => ({ ...f, dos }))}
            />
            <ListEditor
              label="Not Included (Don'ts)"
              icon={Ban}
              color="text-red-500"
              items={form.donts}
              onChange={(donts) => setForm((f) => ({ ...f, donts }))}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              // trigger form submit manually since button is outside form
              e.currentTarget
                .closest(".fixed")
                .querySelector("form")
                .requestSubmit();
            }}
            disabled={isLoading}
            className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-60"
          >
            {isLoading ? "Saving…" : category ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AppHomeCategories = () => {
  const { data: categories = [], isLoading } = useGetHomeCategoriesQuery();
  const [createHomeCategory, { isLoading: isCreating }] =
    useCreateHomeCategoryMutation();
  const [updateHomeCategory, { isLoading: isUpdating }] =
    useUpdateHomeCategoryMutation();
  const [deleteHomeCategory] = useDeleteHomeCategoryMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleSave = async (fd) => {
    try {
      if (editing) {
        await updateHomeCategory({ id: editing.id, body: fd }).unwrap();
        toast.success("Category updated");
      } else {
        await createHomeCategory(fd).unwrap();
        toast.success("Category created");
      }
      setIsModalOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await deleteHomeCategory(id).unwrap();
      toast.success("Category deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Home Categories</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Categories shown on the app home screen grid
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageOff size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No categories yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const isActive =
              cat.status === 1 || cat.status === "1" || cat.status === true;
            const catImages = imageUrls(cat);
            const iconUrl = catImages[0];
            return (
              <div
                key={cat.id}
                className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col"
              >
                {/* Image */}
                <div className="relative h-32 bg-gray-50 flex items-center justify-center">
                  {iconUrl ? (
                    <img
                      src={resolveMediaUrl(iconUrl)}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <ImageOff size={28} className="text-gray-300" />
                  )}
                  {catImages.length > 1 && (
                    <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                      +{catImages.length - 1}
                    </span>
                  )}
                  <span
                    className={`absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      isActive
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {isActive ? (
                      <CheckCircle size={10} />
                    ) : (
                      <XCircle size={10} />
                    )}
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Body */}
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {cat.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{cat.slug}</p>
                  {cat.note && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {cat.note}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto">
                    <span>Order: {cat.sort_order ?? 0}</span>
                    {cat.dos?.length > 0 && (
                      <span className="text-green-600">
                        {cat.dos.length} dos
                      </span>
                    )}
                    {cat.donts?.length > 0 && (
                      <span className="text-red-500">
                        {cat.donts.length} don'ts
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 px-3 py-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setEditing(cat);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        category={editing}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};

export default AppHomeCategories;
