import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetSubscriptionPoliciesQuery,
  useBulkSaveSubscriptionPoliciesMutation,
} from "../../../api/apiSlice";

let _keyCounter = 0;
const newKey = () => ++_keyCounter;

const emptyGroup = () => ({
  _key: newKey(),
  title: "",
  order: 0,
  is_active: true,
  points: [{ _key: newKey(), id: null, text: "" }],
});

const SubscriptionPolicies = () => {
  const [serviceType, setServiceType] = useState("cleaner");
  const { data, isLoading } = useGetSubscriptionPoliciesQuery({
    type: serviceType,
  });
  const [bulkSave, { isLoading: isSaving }] =
    useBulkSaveSubscriptionPoliciesMutation();

  const [heading, setHeading] = useState("");
  const [groups, setGroups] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    if (!data) return;
    setHeading(data.heading || "");
    setGroups(
      (data.groups || []).map((g) => ({
        _key: newKey(),
        title: g.title || "",
        order: g.order ?? 0,
        is_active: g.is_active ?? true,
        points: (g.points || []).map((p) => ({
          _key: newKey(),
          id: p.id || null,
          text: p.text || "",
        })),
      })),
    );
  }, [data]);

  const toggleCollapse = (key) =>
    setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const updateGroup = (gIdx, patch) =>
    setGroups((p) => p.map((g, i) => (i === gIdx ? { ...g, ...patch } : g)));

  const removeGroup = (gIdx) => {
    if (!window.confirm("Remove this group and all its points?")) return;
    setGroups((p) => p.filter((_, i) => i !== gIdx));
  };

  const addPoint = (gIdx) =>
    setGroups((p) =>
      p.map((g, i) =>
        i === gIdx
          ? {
              ...g,
              points: [...g.points, { _key: newKey(), id: null, text: "" }],
            }
          : g,
      ),
    );

  const updatePoint = (gIdx, pIdx, text) =>
    setGroups((p) =>
      p.map((g, i) =>
        i === gIdx
          ? {
              ...g,
              points: g.points.map((pt, j) =>
                j === pIdx ? { ...pt, text } : pt,
              ),
            }
          : g,
      ),
    );

  const removePoint = (gIdx, pIdx) =>
    setGroups((p) =>
      p.map((g, i) =>
        i === gIdx
          ? { ...g, points: g.points.filter((_, j) => j !== pIdx) }
          : g,
      ),
    );

  const handleSave = async () => {
    if (!heading.trim()) return toast.error("Heading is required");

    const payload = {
      type: serviceType,
      heading: heading.trim(),
      groups: groups.map((g) => ({
        title: g.title,
        order: Number(g.order),
        is_active: g.is_active,
        points: g.points
          .filter((pt) => pt.text.trim())
          .map((pt) => ({
            ...(pt.id ? { id: pt.id } : {}),
            text: pt.text.trim(),
          })),
      })),
    };

    try {
      await bulkSave({ body: payload, type: serviceType }).unwrap();
      toast.success("Subscription Policies saved");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
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
            Subscription Rules & Policies
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Policy groups and bullet points shown on the app subscription screen
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

      {/* Section heading */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Section Heading <span className="text-red-500">*</span>
        </label>
        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="e.g. Subscription Rules & Policies"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
        />
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {groups.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No groups yet. Click "Add Group" to get started.
          </p>
        )}

        {groups.map((group, gIdx) => (
          <div
            key={group._key}
            className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
          >
            {/* Group header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <button
                onClick={() => toggleCollapse(group._key)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
              >
                {collapsed[group._key] ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronUp size={16} />
                )}
              </button>

              <input
                value={group.title}
                onChange={(e) => updateGroup(gIdx, { title: e.target.value })}
                placeholder="Group title…"
                className="flex-1 bg-transparent border-0 outline-none text-sm font-medium text-gray-800 placeholder-gray-400"
              />

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">Order</label>
                  <input
                    type="number"
                    min={0}
                    value={group.order}
                    onChange={(e) =>
                      updateGroup(gIdx, { order: e.target.value })
                    }
                    className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                  />
                </div>

                <select
                  value={group.is_active ? "1" : "0"}
                  onChange={(e) =>
                    updateGroup(gIdx, { is_active: e.target.value === "1" })
                  }
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>

                <button
                  onClick={() => removeGroup(gIdx)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove group"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Points */}
            {!collapsed[group._key] && (
              <div className="p-4 space-y-2">
                {group.points.map((pt, pIdx) => (
                  <div key={pt._key} className="flex items-center gap-2">
                    <span className="text-gray-300 text-xs shrink-0 w-5 text-right">
                      {pIdx + 1}.
                    </span>
                    <input
                      value={pt.text}
                      onChange={(e) => updatePoint(gIdx, pIdx, e.target.value)}
                      placeholder="Bullet point text…"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                    <button
                      onClick={() => removePoint(gIdx, pIdx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Remove point"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => addPoint(gIdx)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-2 ml-7"
                >
                  <Plus size={13} /> Add point
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add group */}
      <button
        onClick={() => setGroups((p) => [...p, emptyGroup()])}
        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        <Plus size={16} /> Add Group
      </button>
    </div>
  );
};

export default SubscriptionPolicies;
