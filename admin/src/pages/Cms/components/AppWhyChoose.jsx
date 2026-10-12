import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save, Upload, ImageOff, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetWhyChooseCmsQuery,
  useBulkSaveWhyChooseMutation,
  useDeleteWhyChooseCardMutation,
} from "../../../api/apiSlice";
import { resolveMediaUrl } from "../../../utils/imageUrl";

let _keyCounter = 0;
const newKey = () => ++_keyCounter;

const AppWhyChoose = () => {
  const [serviceType, setServiceType] = useState("cleaner");
  const { data, isLoading } = useGetWhyChooseCmsQuery({ type: serviceType });
  const [bulkSave, { isLoading: isSaving }] = useBulkSaveWhyChooseMutation();
  const [deleteCard] = useDeleteWhyChooseCardMutation();

  const [heading, setHeading] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [isActive, setIsActive] = useState("1");
  const [sectionIconFile, setSectionIconFile] = useState(null);
  const [sectionIconPreview, setSectionIconPreview] = useState(null);
  const [sectionIconRemoved, setSectionIconRemoved] = useState(false);
  const [cards, setCards] = useState([]);

  const sectionIconRef = useRef(null);
  const cardIconRefs = useRef({});

  useEffect(() => {
    if (!data) return;
    setHeading(data.heading || "");
    setSubtitle(data.subtitle || "");
    setIsActive(data.is_active != null ? String(Number(data.is_active)) : "1");
    setSectionIconFile(null);
    setSectionIconPreview(data.section_icon || null);
    setSectionIconRemoved(false);
    setCards(
      (data.cards || []).map((c) => ({
        _key: newKey(),
        id: c.id,
        card_title: c.card_title || "",
        iconFile: null,
        iconPreview: c.card_icon || null,
        iconRemoved: false,
      })),
    );
  }, [data]);

  const updateCard = (idx, patch) =>
    setCards((p) => p.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const handleCardIconChange = (idx, file) => {
    if (!file) return;
    updateCard(idx, {
      iconFile: file,
      iconPreview: URL.createObjectURL(file),
      iconRemoved: false,
    });
  };

  const handleSectionIconChange = (file) => {
    if (!file) return;
    setSectionIconFile(file);
    setSectionIconPreview(URL.createObjectURL(file));
    setSectionIconRemoved(false);
  };

  const handleSectionIconRemove = () => {
    setSectionIconFile(null);
    setSectionIconPreview(null);
    setSectionIconRemoved(true);
  };

  const handleDeleteCard = async (idx) => {
    const card = cards[idx];
    if (card.id) {
      if (!window.confirm("Delete this card?")) return;
      try {
        await deleteCard(card.id).unwrap();
        toast.success("Card deleted");
      } catch {
        toast.error("Failed to delete");
        return;
      }
    }
    setCards((p) => p.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!heading.trim()) return toast.error("Heading is required");
    const fd = new FormData();
    fd.append("heading", heading.trim());
    fd.append("subtitle", subtitle.trim());
    fd.append("is_active", isActive);
    fd.append("type", serviceType);
    if (sectionIconFile) fd.append("section_icon", sectionIconFile);
    if (sectionIconRemoved) fd.append("remove_section_icon", "1");

    cards.forEach((card, n) => {
      if (card.id) fd.append(`item_id[${n}]`, String(card.id));
      fd.append(`card_title[${n}]`, card.card_title);
      if (card.iconFile) {
        fd.append(`card_icon[${n}]`, card.iconFile);
      } else if (card.iconRemoved) {
        fd.append(`remove_card_icon[${n}]`, "1");
      }
    });

    try {
      await bulkSave({ formData: fd, type: serviceType }).unwrap();
      toast.success("Why Choose Hobit saved");
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
          <h2 className="text-xl font-bold text-gray-900">Why Choose Hobit?</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Cards displayed on the app subscription "Why Choose" section
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
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Heading <span className="text-red-500">*</span>
            </label>
            <input
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. Why Choose Hobit?"
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

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Subtitle
          </label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Premium monthly cleaning benefits"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
          />
        </div>

        {/* Section icon */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Section Icon
          </label>
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => sectionIconRef.current?.click()}
              title="Click to upload section icon"
            >
              {sectionIconPreview ? (
                <img
                  src={
                    sectionIconPreview.startsWith("blob:")
                      ? sectionIconPreview
                      : resolveMediaUrl(sectionIconPreview)
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageOff size={18} className="text-gray-300" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => sectionIconRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
              >
                <Upload size={13} />
                {sectionIconPreview ? "Change Icon" : "Upload Icon"}
              </button>
              {sectionIconPreview && (
                <button
                  type="button"
                  onClick={handleSectionIconRemove}
                  className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                  Remove Icon
                </button>
              )}
            </div>
            <input
              ref={sectionIconRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleSectionIconChange(e.target.files[0])}
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Cards</p>
        <div className="space-y-3">
          {cards.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              No cards yet. Click "Add Card" to get started.
            </p>
          )}
          {cards.map((card, idx) => (
            <div
              key={card._key}
              className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
            >
              {/* Card icon */}
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => cardIconRefs.current[idx]?.click()}
                  title="Click to upload card icon"
                >
                  {card.iconPreview ? (
                    <img
                      src={
                        card.iconPreview.startsWith("blob:")
                          ? card.iconPreview
                          : resolveMediaUrl(card.iconPreview)
                      }
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload size={16} className="text-gray-300" />
                  )}
                </div>
                {card.iconPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCard(idx, {
                        iconFile: null,
                        iconPreview: null,
                        iconRemoved: true,
                      });
                      if (cardIconRefs.current[idx])
                        cardIconRefs.current[idx].value = "";
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                    title="Remove image"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <input
                ref={(el) => (cardIconRefs.current[idx] = el)}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCardIconChange(idx, e.target.files[0])}
              />

              {/* Card title */}
              <input
                value={card.card_title}
                onChange={(e) =>
                  updateCard(idx, { card_title: e.target.value })
                }
                placeholder="Card title…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />

              {/* Delete */}
              <button
                onClick={() => handleDeleteCard(idx)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add card */}
      <button
        onClick={() =>
          setCards((p) => [
            ...p,
            {
              _key: newKey(),
              id: null,
              card_title: "",
              iconFile: null,
              iconPreview: null,
            },
          ])
        }
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        <Plus size={16} /> Add Card
      </button>
    </div>
  );
};

export default AppWhyChoose;
