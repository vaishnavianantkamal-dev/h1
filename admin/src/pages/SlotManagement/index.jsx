import React, { useState, useEffect, useRef, startTransition } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Calendar,
  X,
  Ban,
  Unlock,
  CheckCircle,
  XCircle,
  ListPlus,
  Clock,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  CalendarDays,
  Filter,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import TableSkeleton from "../../components/TableSkeleton";
import {
  useGetServiceCategoriesQuery,
  useGetTimeSlotsQuery,
  useGetTimeSlotQuery,
  useCreateTimeSlotMutation,
  useCreateBulkTimeSlotsMutation,
  useUpdateTimeSlotMutation,
  useDeleteTimeSlotMutation,
  useRestoreTimeSlotMutation,
  useGetBlockedSlotsQuery,
  useGetSlotStatusQuery,
  useBlockTimeSlotsMutation,
  useUnblockTimeSlotsMutation,
} from "../../api/apiSlice";

const formatTime12 = (t) => {
  if (!t) return "";
  const parts = String(t).split(":");
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] ?? "00";
  if (Number.isNaN(hour)) return t;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

const formatDate = (str) => {
  if (!str) return "—";
  const datePart = String(str).split(/[T ]/)[0];
  return datePart || "—";
};

/* ------------------------------------------------------------------ */
/* Root page                                                           */
/* ------------------------------------------------------------------ */
const SlotManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("block");

  const tabs = [
    { id: "block", label: "Block / Unblock", icon: ShieldAlert },
    { id: "permanent", label: "Permanent Block", icon: Ban },
    { id: "slots", label: "Manage Slots", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/settings", { state: { activeTab: "slot-management" } })}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            title="Back to Settings"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Slot Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage time slots and block availability by date &amp; category
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${
                activeTab === id
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon size={15} />
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "block" && <BlockManagement />}
      {activeTab === "permanent" && <PermanentBlockManagement />}
      {activeTab === "slots" && <SlotMaster />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Block Management                                                    */
/* ------------------------------------------------------------------ */
const BlockManagement = () => {
  const { data: categoriesRaw = [] } = useGetServiceCategoriesQuery();
  const categories = categoriesRaw.filter((c) => Number(c.status) === 1);
  const { data: slots = [], isLoading: slotsLoading } = useGetTimeSlotsQuery();

  const [blockTimeSlots, { isLoading: isBlocking }] = useBlockTimeSlotsMutation();
  const [unblockTimeSlots, { isLoading: isUnblocking }] = useUnblockTimeSlotsMutation();

  const [dateInput, setDateInput] = useState("");
  const [dates, setDates] = useState([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");

  const addDate = () => {
    const val = (dateInput || "").trim();
    if (!val) return;
    setDates((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setDateInput("");
  };

  const removeDate = (d) => setDates((prev) => prev.filter((x) => x !== d));

  const toggleSlot = (id) => {
    const numId = Number(id);
    setSelectedSlotIds((prev) =>
      prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId]
    );
  };

  const allSelected = slots.length > 0 && selectedSlotIds.length === slots.length;
  const toggleAll = () =>
    setSelectedSlotIds(allSelected ? [] : slots.map((s) => Number(s.id)));

  const resetForm = () => {
    setDates([]);
    setDateInput("");
    setSelectedSlotIds([]);
    setCategoryId("");
    setReason("");
  };

  const validate = () => {
    if (dates.length === 0) { toast.error("Add at least one date"); return false; }
    if (selectedSlotIds.length === 0) { toast.error("Select at least one time slot"); return false; }
    return true;
  };

  const handleBlock = async () => {
    if (!validate()) return;
    try {
      const res = await blockTimeSlots({
        dates,
        time_slot_ids: selectedSlotIds,
        ...(categoryId ? { category_id: Number(categoryId) } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }).unwrap();
      toast.success(res?.message || "Slots blocked");
      resetForm();
    } catch (e) {
      toast.error(e?.data?.message || "Failed to block slots");
    }
  };

  const handleUnblock = async () => {
    if (!validate()) return;
    try {
      const res = await unblockTimeSlots({
        dates,
        time_slot_ids: selectedSlotIds,
        ...(categoryId ? { category_id: Number(categoryId) } : {}),
      }).unwrap();
      toast.success(res?.message || "Slots unblocked");
      resetForm();
    } catch (e) {
      toast.error(e?.data?.message || "Failed to unblock slots");
    }
  };

  return (
    <div className="space-y-6">
      {/* Block / Unblock card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Block / Unblock Slots</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Leave category empty to apply to all categories. Add multiple dates to apply in bulk.
          </p>
        </div>

        <div className="p-6 grid lg:grid-cols-2 gap-8">
          {/* Left */}
          <div className="space-y-5">
            {/* Date picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dates <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDate()}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <button
                  onClick={addDate}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </div>
              {dates.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {dates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      <CalendarDays size={11} />
                      {d}
                      <button
                        onClick={() => removeDate(d)}
                        className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Customer-facing message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message shown to customer <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Sold Out"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Right — time slot pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Time Slots <span className="text-red-500">*</span>
              </label>
              {slots.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                  {allSelected ? "Clear All" : "Select All"}
                </button>
              )}
            </div>

            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <Clock size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No slots yet. Add slots in the Manage Slots tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {slots.map((slot) => {
                  const isSelected = selectedSlotIds.includes(Number(slot.id));
                  return (
                    <button
                      key={slot.id}
                      onClick={() => toggleSlot(slot.id)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <Clock size={11} />
                      {slot.display_label || formatTime12(slot.slot_time)}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSlotIds.length > 0 && (
              <p className="mt-2 text-xs text-primary font-medium">
                {selectedSlotIds.length} slot{selectedSlotIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap justify-end gap-3">
          <button
            onClick={resetForm}
            className="px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleUnblock}
            disabled={isBlocking || isUnblocking}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors disabled:opacity-60"
          >
            <Unlock size={15} />
            {isUnblocking ? "Unblocking…" : "Unblock Slots"}
          </button>
          <button
            onClick={handleBlock}
            disabled={isBlocking || isUnblocking}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60"
          >
            <Ban size={15} />
            {isBlocking ? "Blocking…" : "Block Slots"}
          </button>
        </div>
      </div>

      {/* Check availability */}
      <SlotStatusViewer categories={categories} />

      {/* Blocked list */}
      <BlockedSlotsList categories={categories} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Slot Status Viewer                                                  */
/* ------------------------------------------------------------------ */
const SlotStatusViewer = ({ categories }) => {
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const { data: statusSlots = [], isFetching } = useGetSlotStatusQuery(
    { date, category_id: categoryId || undefined },
    { skip: !date }
  );

  const available = statusSlots.filter((s) => !s.is_blocked);
  const blocked = statusSlots.filter((s) => s.is_blocked);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-base font-semibold text-gray-900">Check Slot Availability</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Pick a date to see which slots are available or blocked.
        </p>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white min-w-45"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>

        {!date ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <CalendarDays size={36} className="mb-2 opacity-25" />
            <p className="text-sm">Select a date above to check slot availability.</p>
          </div>
        ) : isFetching ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : statusSlots.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No slots found for this date.</p>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle size={12} /> {available.length} Available
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                <Ban size={12} /> {blocked.length} Blocked
              </span>
            </div>
            {/* Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {statusSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-xl text-xs font-medium border ${
                    slot.is_blocked
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }`}
                >
                  <Clock size={12} className="mb-1 opacity-70" />
                  <span>{slot.display_label || formatTime12(slot.slot_time)}</span>
                  <span className="mt-0.5 opacity-70 text-[10px]">
                    {slot.is_blocked ? "Blocked" : "Open"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Blocked Slots List                                                  */
/* ------------------------------------------------------------------ */
const BlockedSlotsList = ({ categories }) => {
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: blocked = [], isLoading, isFetching } = useGetBlockedSlotsQuery({
    date: date || undefined,
    category_id: categoryId || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  const hasFilters = date || categoryId || fromDate || toDate;

  const clearFilters = () => {
    setDate(""); setCategoryId(""); setFromDate(""); setToDate("");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Blocked Slots</h2>
            <p className="text-sm text-gray-500 mt-0.5">View all currently blocked time slots</p>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">To</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : blocked.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-gray-400">
          <Ban size={36} className="mb-2 opacity-20" />
          <p className="text-sm">{isFetching ? "Loading…" : "No blocked slots found."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                {["Date", "Time Slot", "Category", "Reason", "Blocked By", "Created"].map((h) => (
                  <th key={h} className="py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {blocked.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      <CalendarDays size={13} className="text-gray-400" />
                      {b.blocked_date}
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <Clock size={13} className="text-gray-400" />
                      {b.slot_label || formatTime12(b.slot_time)}
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      {b.category_name || "All Categories"}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-sm text-gray-600">{b.reason || "—"}</td>
                  <td className="py-3.5 px-6 text-sm text-gray-600">{b.blocked_by || "—"}</td>
                  <td className="py-3.5 px-6 text-sm text-gray-400">{formatDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Permanent Block Management                                          */
/* ------------------------------------------------------------------ */
const PermanentBlockManagement = () => {
  const { data: categoriesRaw = [] } = useGetServiceCategoriesQuery();
  const categories = categoriesRaw.filter((c) => Number(c.status) === 1);
  const { data: slots = [], isLoading: slotsLoading } = useGetTimeSlotsQuery();

  const [blockTimeSlots, { isLoading: isBlocking }] = useBlockTimeSlotsMutation();
  const [unblockTimeSlots, { isLoading: isUnblocking }] = useUnblockTimeSlotsMutation();

  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const { data: allBlocked = [], isLoading: isLoadingBlocks, isFetching } =
    useGetBlockedSlotsQuery({ category_id: filterCategoryId || undefined });
  const permanentBlocks = allBlocked.filter(
    (b) => b.scope === "all_days" || b.blocked_date === null
  );

  const toggleSlot = (id) => {
    const numId = Number(id);
    setSelectedSlotIds((prev) =>
      prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId]
    );
  };

  const allSelected = slots.length > 0 && selectedSlotIds.length === slots.length;
  const toggleAll = () =>
    setSelectedSlotIds(allSelected ? [] : slots.map((s) => Number(s.id)));

  const resetForm = () => {
    setSelectedSlotIds([]);
    setCategoryId("");
    setReason("");
  };

  const validate = () => {
    if (selectedSlotIds.length === 0) { toast.error("Select at least one time slot"); return false; }
    return true;
  };

  const handleBlockPermanently = async () => {
    if (!validate()) return;
    try {
      const res = await blockTimeSlots({
        all_days: true,
        time_slot_ids: selectedSlotIds,
        ...(categoryId ? { category_id: Number(categoryId) } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }).unwrap();
      toast.success(res?.message || "Slots permanently blocked");
      resetForm();
    } catch (e) {
      toast.error(e?.data?.message || "Failed to block slots");
    }
  };

  const handleUnblockPermanently = async () => {
    if (!validate()) return;
    try {
      const res = await unblockTimeSlots({
        all_days: true,
        time_slot_ids: selectedSlotIds,
        ...(categoryId ? { category_id: Number(categoryId) } : {}),
      }).unwrap();
      toast.success(res?.message || "Permanent block removed");
      resetForm();
    } catch (e) {
      toast.error(e?.data?.message || "Failed to unblock slots");
    }
  };

  const handleUnblockSingle = async (slotId, catId) => {
    try {
      const res = await unblockTimeSlots({
        all_days: true,
        time_slot_ids: [slotId],
        ...(catId ? { category_id: catId } : {}),
      }).unwrap();
      toast.success(res?.message || "Permanent block removed");
    } catch (e) {
      toast.error(e?.data?.message || "Failed to unblock");
    }
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <Ban size={18} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">Permanent Block</p>
          <p className="mt-0.5 text-amber-700 text-xs leading-relaxed">
            Permanently blocked slots appear as unavailable on <strong>every date</strong> until
            you manually unblock them. Leave category empty to block globally across all categories.
          </p>
        </div>
      </div>

      {/* Block card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Block Slots Permanently</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Select slots and an optional category, then block or unblock.
          </p>
        </div>

        <div className="p-6 grid lg:grid-cols-2 gap-8">
          {/* Left */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">All Categories (global)</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message shown to customer <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Sold Out"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Right — slot pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Time Slots <span className="text-red-500">*</span>
              </label>
              {slots.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                  {allSelected ? "Clear All" : "Select All"}
                </button>
              )}
            </div>

            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                <Clock size={28} className="mb-2 opacity-40" />
                <p className="text-sm">No slots yet. Add slots in the Manage Slots tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {slots.map((slot) => {
                  const isSelected = selectedSlotIds.includes(Number(slot.id));
                  return (
                    <button
                      key={slot.id}
                      onClick={() => toggleSlot(slot.id)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                    >
                      <Clock size={11} />
                      {slot.display_label || formatTime12(slot.slot_time)}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSlotIds.length > 0 && (
              <p className="mt-2 text-xs text-amber-600 font-medium">
                {selectedSlotIds.length} slot{selectedSlotIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap justify-end gap-3">
          <button
            onClick={resetForm}
            className="px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleUnblockPermanently}
            disabled={isBlocking || isUnblocking}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors disabled:opacity-60"
          >
            <Unlock size={15} />
            {isUnblocking ? "Removing…" : "Remove Permanent Block"}
          </button>
          <button
            onClick={handleBlockPermanently}
            disabled={isBlocking || isUnblocking}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-60"
          >
            <Ban size={15} />
            {isBlocking ? "Blocking…" : "Block Permanently"}
          </button>
        </div>
      </div>

      {/* Permanent blocks list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Active Permanent Blocks</h2>
              <p className="text-sm text-gray-500 mt-0.5">Slots blocked on all dates until manually unblocked</p>
            </div>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoadingBlocks ? (
          <TableSkeleton columns={4} rows={4} />
        ) : permanentBlocks.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-gray-400">
            <Ban size={36} className="mb-2 opacity-20" />
            <p className="text-sm">{isFetching ? "Loading…" : "No permanent blocks found."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {["Time Slot", "Category", "Reason", "Blocked By", "Created", "Action"].map((h) => (
                    <th key={h} className={`py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Action" ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {permanentBlocks.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                        <Clock size={13} className="text-amber-500" />
                        {b.slot_label || formatTime12(b.slot_time)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                        {b.category_name || "All Categories"}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-sm text-gray-600">{b.reason || "—"}</td>
                    <td className="py-3.5 px-6 text-sm text-gray-600">{b.blocked_by || "—"}</td>
                    <td className="py-3.5 px-6 text-sm text-gray-400">{formatDate(b.created_at)}</td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleUnblockSingle(b.time_slot_id || b.id, b.category_id || null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                      >
                        <Unlock size={12} />
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Slot Master                                                         */
/* ------------------------------------------------------------------ */
const EMPTY_SLOT_FORM = {
  id: null,
  slot_time: "",
  label: "",
  price: "",
  sort_order: "",
  is_active: true,
};

const SlotMaster = () => {
  const [showTrashed, setShowTrashed] = useState(false);
  const { data: slots = [], isLoading } = useGetTimeSlotsQuery({ with_trashed: showTrashed });

  const [createTimeSlot, { isLoading: isCreating }] = useCreateTimeSlotMutation();
  const [updateTimeSlot, { isLoading: isUpdating }] = useUpdateTimeSlotMutation();
  const [createBulkTimeSlots, { isLoading: isBulkCreating }] = useCreateBulkTimeSlotsMutation();
  const [deleteTimeSlot] = useDeleteTimeSlotMutation();
  const [restoreTimeSlot] = useRestoreTimeSlotMutation();

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotMode, setSlotMode] = useState("add");
  const [slotForm, setSlotForm] = useState(EMPTY_SLOT_FORM);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const appliedEditIdRef = useRef(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [search, setSearch] = useState("");

  const { data: editSlotData, isFetching: isFetchingSlot } = useGetTimeSlotQuery(
    editingSlotId,
    { skip: !editingSlotId }
  );

  const fillFormFromSlot = (slot) => ({
    id: slot.id,
    slot_time: slot.slot_time || "",
    label: slot.label || "",
    price: slot.price ?? "",
    sort_order: slot.sort_order ?? "",
    is_active: Boolean(slot.is_active),
  });

  useEffect(() => {
    if (
      editSlotData &&
      editSlotData.id === editingSlotId &&
      appliedEditIdRef.current !== editingSlotId
    ) {
      startTransition(() => setSlotForm(fillFormFromSlot(editSlotData)));
      appliedEditIdRef.current = editingSlotId;
    }
  }, [editSlotData, editingSlotId]);

  const openAdd = () => {
    setSlotMode("add");
    setSlotForm(EMPTY_SLOT_FORM);
    setEditingSlotId(null);
    appliedEditIdRef.current = null;
    setIsSlotModalOpen(true);
  };

  const openEdit = (slot) => {
    setSlotMode("edit");
    setSlotForm(fillFormFromSlot(slot));
    appliedEditIdRef.current = null;
    setEditingSlotId(slot.id);
    setIsSlotModalOpen(true);
  };

  const closeSlotModal = () => {
    setIsSlotModalOpen(false);
    setEditingSlotId(null);
    appliedEditIdRef.current = null;
  };

  const handleSlotFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSlotForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSaveSlot = async () => {
    const body = {
      label: slotForm.label?.trim() || null,
      price: slotForm.price === "" ? null : Number(slotForm.price),
      sort_order: slotForm.sort_order === "" ? null : Number(slotForm.sort_order),
      is_active: slotForm.is_active,
    };
    try {
      if (slotMode === "add") {
        if (!slotForm.slot_time) { toast.error("Slot time is required"); return; }
        await createTimeSlot({ ...body, slot_time: slotForm.slot_time }).unwrap();
        toast.success("Time slot created");
      } else {
        await updateTimeSlot({ id: slotForm.id, ...body }).unwrap();
        toast.success("Time slot updated");
      }
      closeSlotModal();
      setSlotForm(EMPTY_SLOT_FORM);
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.errors?.slot_time?.[0] || "Failed to save");
    }
  };

  const handleBulkSave = async () => {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Enter at least one slot time"); return; }
    const parsed = lines.map((line) => {
      const [time, price, label] = line.split(",").map((p) => p.trim());
      const slot = { slot_time: time };
      if (price) slot.price = Number(price);
      if (label) slot.label = label;
      return slot;
    });
    try {
      const res = await createBulkTimeSlots({ slots: parsed }).unwrap();
      toast.success(res?.message || "Slots created");
      setIsBulkModalOpen(false);
      setBulkText("");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create slots");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this time slot?")) return;
    try {
      await deleteTimeSlot(id).unwrap();
      toast.success("Time slot deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete");
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreTimeSlot(id).unwrap();
      toast.success("Time slot restored");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to restore");
    }
  };

  const filtered = slots.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      formatTime12(s.slot_time).toLowerCase().includes(q) ||
      (s.label || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search slots…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-52"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTrashed}
              onChange={(e) => setShowTrashed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            Show deleted
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setBulkText(""); setIsBulkModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ListPlus size={16} /> Bulk Add
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Slot
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={6} rows={6} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-gray-400">
            <Clock size={36} className="mb-2 opacity-20" />
            <p className="text-sm">{slots.length === 0 ? "No time slots yet. Add one to get started." : "No slots match your search."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  {["Time", "Label", "Price", "Sort", "Status", "Actions"].map((h) => (
                    <th key={h} className={`py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "Actions" ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((slot) => {
                  const isDeleted = Boolean(slot.deleted_at);
                  return (
                    <tr
                      key={slot.id}
                      className={`hover:bg-gray-50/60 transition-colors ${isDeleted ? "opacity-50" : ""}`}
                    >
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock size={13} className="text-primary" />
                          </span>
                          {formatTime12(slot.slot_time)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-gray-600">
                        {slot.display_label || slot.label || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-medium text-gray-700">
                        {slot.price != null ? `₹${slot.price}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-gray-500">
                        {slot.sort_order ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-6">
                        {isDeleted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                            <Trash2 size={11} /> Deleted
                          </span>
                        ) : slot.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                            <CheckCircle size={11} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                            <XCircle size={11} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isDeleted ? (
                            <button
                              onClick={() => handleRestore(slot.id)}
                              title="Restore"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <RotateCcw size={15} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => openEdit(slot)}
                                title="Edit"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(slot.id)}
                                title="Delete"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={closeSlotModal}
        title={slotMode === "add" ? "Add Time Slot" : "Edit Time Slot"}
      >
        <div className="space-y-4">
          {slotMode === "edit" && isFetchingSlot && (
            <p className="text-xs text-primary flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading slot details…
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slot Time {slotMode === "add" && <span className="text-red-500">*</span>}
            </label>
            <input
              type="time"
              name="slot_time"
              value={slotForm.slot_time ? slotForm.slot_time.slice(0, 5) : ""}
              onChange={handleSlotFormChange}
              disabled={slotMode === "edit"}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-100 disabled:text-gray-400"
            />
            {slotMode === "edit" && (
              <p className="text-xs text-gray-400 mt-1">Slot time cannot be changed after creation.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              type="text"
              name="label"
              value={slotForm.label}
              onChange={handleSlotFormChange}
              placeholder="e.g. Morning Special"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                name="price"
                value={slotForm.price}
                onChange={handleSlotFormChange}
                placeholder="Optional"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                name="sort_order"
                value={slotForm.sort_order}
                onChange={handleSlotFormChange}
                placeholder="Optional"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_active"
              checked={slotForm.is_active}
              onChange={handleSlotFormChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            Active
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={closeSlotModal}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSlot}
              disabled={isCreating || isUpdating}
              className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-60"
            >
              {slotMode === "add" ? (isCreating ? "Saving…" : "Save") : (isUpdating ? "Updating…" : "Update")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Add Time Slots"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
            One slot per line. Format: <code className="font-mono bg-blue-100 px-1 rounded">HH:MM</code> or{" "}
            <code className="font-mono bg-blue-100 px-1 rounded">HH:MM, price, label</code>
            <br />
            Example: <code className="font-mono bg-blue-100 px-1 rounded">12:00, 50, Noon Slot</code>
          </div>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            placeholder={"09:00\n09:30\n10:00\n12:00, 50, Noon Slot"}
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSave}
              disabled={isBulkCreating}
              className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-60"
            >
              {isBulkCreating ? "Creating…" : "Create Slots"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SlotManagement;
