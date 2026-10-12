import React, { useState } from "react";
import { Plus, Trash2, Save, Pencil, X, Power } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetBookingInstructionsQuery,
  useCreateBookingInstructionMutation,
  useUpdateBookingInstructionMutation,
  useToggleBookingInstructionMutation,
  useDeleteBookingInstructionMutation,
  useGetSubscriptionTypesQuery,
} from "../../../api/apiSlice";

const emptyForm = { text: "", order: 0, is_active: true, subscription_ids: [] };

const isInstructionActive = (ins) =>
  ins?.is_active === true || ins?.is_active === 1 || ins?.is_active === "1";

const BookingInstructions = () => {
  const [filterSubscriptionId, setFilterSubscriptionId] = useState("");
  const { data: instructions = [], isLoading } = useGetBookingInstructionsQuery(
    filterSubscriptionId ? { subscriptionId: filterSubscriptionId } : {},
  );
  const { data: subscriptionTypes = [] } = useGetSubscriptionTypesQuery();

  const [createInstruction, { isLoading: isCreating }] =
    useCreateBookingInstructionMutation();
  const [updateInstruction, { isLoading: isUpdating }] =
    useUpdateBookingInstructionMutation();
  const [toggleInstruction] = useToggleBookingInstructionMutation();
  const [deleteInstruction] = useDeleteBookingInstructionMutation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const isSaving = isCreating || isUpdating;

  const sortedInstructions = [...instructions].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0),
  );

  const subscriptionName = (id) =>
    subscriptionTypes.find((t) => Number(t.id) === Number(id))?.name ||
    `#${id}`;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, order: instructions.length + 1 });
    setIsFormOpen(true);
  };

  const openEdit = (ins) => {
    setEditingId(ins.id);
    setForm({
      text: ins.text || "",
      order: ins.order ?? 0,
      is_active: isInstructionActive(ins),
      subscription_ids: Array.isArray(ins.subscription_ids)
        ? ins.subscription_ids.map(Number)
        : [],
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleSubscriptionId = (id) =>
    setForm((f) => ({
      ...f,
      subscription_ids: f.subscription_ids.includes(id)
        ? f.subscription_ids.filter((s) => s !== id)
        : [...f.subscription_ids, id],
    }));

  const handleSave = async () => {
    if (!form.text.trim()) return toast.error("Instruction text is required");
    if (form.subscription_ids.length === 0)
      return toast.error("Select at least one subscription type");

    const payload = {
      text: form.text.trim(),
      order: Number(form.order) || 0,
      is_active: !!form.is_active,
      subscription_ids: form.subscription_ids,
    };

    try {
      if (editingId) {
        await updateInstruction({ id: editingId, ...payload }).unwrap();
        toast.success("Instruction updated");
      } else {
        await createInstruction(payload).unwrap();
        toast.success("Instruction created");
      }
      closeForm();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save instruction");
    }
  };

  const handleToggle = async (ins) => {
    try {
      await toggleInstruction(ins.id).unwrap();
      toast.success(
        isInstructionActive(ins)
          ? "Instruction deactivated"
          : "Instruction activated",
      );
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (ins) => {
    if (!window.confirm("Delete this instruction?")) return;
    try {
      await deleteInstruction(ins.id).unwrap();
      if (editingId === ins.id) closeForm();
      toast.success("Instruction deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete instruction");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
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
            Booking Instructions
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Numbered instructions shown on the app booking screen, per
            subscription type
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium shrink-0"
        >
          <Plus size={15} />
          Add Instruction
        </button>
      </div>

      {/* Subscription filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">
          Filter by subscription
        </label>
        <select
          value={filterSubscriptionId}
          onChange={(e) => setFilterSubscriptionId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
        >
          <option value="">All subscriptions</option>
          {subscriptionTypes.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create / edit modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Instruction" : "Add Instruction"}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Instruction Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.text}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, text: e.target.value }))
                  }
                  rows={3}
                  placeholder="e.g. Bookings can be cancelled or rescheduled up to 3 hours before the selected slot…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-gray-500">Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, order: e.target.value }))
                    }
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                  />
                </div>

                <select
                  value={form.is_active ? "1" : "0"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      is_active: e.target.value === "1",
                    }))
                  }
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Subscriptions <span className="text-red-500">*</span>
                </label>
                {subscriptionTypes.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No subscription types found.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subscriptionTypes.map((t) => {
                      const selected = form.subscription_ids.includes(
                        Number(t.id),
                      );
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleSubscriptionId(Number(t.id))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            selected
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-600 border-gray-200 hover:border-primary/40"
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-60"
              >
                <Save size={14} />
                {isSaving
                  ? "Saving…"
                  : editingId
                    ? "Update Instruction"
                    : "Create Instruction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instruction list */}
      <div className="space-y-3">
        {sortedInstructions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No instructions yet. Click "Add Instruction" to get started.
          </p>
        )}

        {sortedInstructions.map((ins) => {
          const active = isInstructionActive(ins);
          const linkedIds = Array.isArray(ins.subscription_ids)
            ? ins.subscription_ids
            : [];
          return (
            <div
              key={ins.id}
              className={`flex items-start gap-3 bg-white border rounded-xl shadow-sm p-4 ${
                active ? "border-gray-100" : "border-gray-100 opacity-60"
              }`}
            >
              <span className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                {ins.order ?? 0}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{ins.text}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {active ? "Active" : "Inactive"}
                  </span>
                  {linkedIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-medium"
                    >
                      {subscriptionName(id)}
                    </span>
                  ))}
                  {linkedIds.length === 0 && (
                    <span className="text-[10px] text-gray-400">
                      No subscriptions linked
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggle(ins)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    active
                      ? "text-green-600 hover:bg-green-50"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                  title={active ? "Deactivate" : "Activate"}
                >
                  <Power size={14} />
                </button>
                <button
                  onClick={() => openEdit(ins)}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(ins)}
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
    </div>
  );
};

export default BookingInstructions;
