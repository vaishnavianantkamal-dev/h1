import React, { useState } from "react";
import { Plus, Edit2, Trash2, GripVertical, CheckCircle, XCircle, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  useGetMarqueesQuery,
  useCreateMarqueeMutation,
  useUpdateMarqueeMutation,
  useDeleteMarqueeMutation,
} from "../../../api/apiSlice";

const EMPTY_FORM = { text: "", status: 1, sort_order: 0 };

const MarqueeModal = ({ isOpen, onClose, sentence, onSave, isLoading }) => {
  const [form, setForm] = useState(
    sentence
      ? { text: sentence.text, status: sentence.status ?? 1, sort_order: sentence.sort_order ?? 0 }
      : EMPTY_FORM,
  );

  React.useEffect(() => {
    setForm(
      sentence
        ? { text: sentence.text, status: sentence.status ?? 1, sort_order: sentence.sort_order ?? 0 }
        : EMPTY_FORM,
    );
  }, [sentence, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.text.trim()) return toast.error("Text is required");
    onSave({ ...form, sort_order: Number(form.sort_order) });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {sentence ? "Edit Sentence" : "Add Sentence"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Text <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="e.g. Trusted home services now in your city – book a helper in minutes"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort Order</label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-60"
            >
              {isLoading ? "Saving…" : sentence ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AppMarquee = () => {
  const { data: sentences = [], isLoading } = useGetMarqueesQuery();
  const [createMarquee, { isLoading: isCreating }] = useCreateMarqueeMutation();
  const [updateMarquee, { isLoading: isUpdating }] = useUpdateMarqueeMutation();
  const [deleteMarquee] = useDeleteMarqueeMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleSave = async (body) => {
    try {
      if (editing) {
        await updateMarquee({ id: editing.id, body }).unwrap();
        toast.success("Sentence updated");
      } else {
        await createMarquee(body).unwrap();
        toast.success("Sentence created");
      }
      setIsModalOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sentence?")) return;
    try {
      await deleteMarquee(id).unwrap();
      toast.success("Sentence deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Marquee Sentences</h2>
          <p className="text-sm text-gray-500 mt-0.5">Scrolling text shown on the app home screen</p>
        </div>
        <button
          onClick={() => { setEditing(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          Add Sentence
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sentences.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GripVertical size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No marquee sentences yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sentences.map((s) => {
            const isActive = s.status === 1 || s.status === true;
            return (
              <div
                key={s.id}
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-4 shadow-sm"
              >
                <GripVertical size={18} className="text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-relaxed truncate">{s.text}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">Order: {s.sort_order ?? 0}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                        isActive
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditing(s); setIsModalOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MarqueeModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(null); }}
        sentence={editing}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};

export default AppMarquee;
