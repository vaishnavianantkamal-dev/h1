import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import TableSkeleton from "../../components/TableSkeleton";
import {
  useCreateEventMutation,
  useDeleteEventMutation,
  useGetEventsQuery,
} from "../../api/apiSlice";

const formatTime12 = (timeStr) => {
  if (!timeStr) return "N/A";
  // supports "HH:mm" or "HH:mm:ss"
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(timeStr).trim());
  if (!match) return timeStr;

  const hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours)) return timeStr;

  const period = hours >= 12 ? "PM" : "AM";
  const h12 = ((hours + 11) % 12) + 1;
  return `${String(h12).padStart(2, "0")}:${minutes} ${period}`;
};

const toTime24 = ({ hour12, minute, period }) => {
  if (!hour12 || !minute || !period) return "";
  const h = Number(hour12);
  const m = String(minute).padStart(2, "0");
  if (Number.isNaN(h) || h < 1 || h > 12) return "";
  if (!/^\d{2}$/.test(m)) return "";
  const isPM = String(period).toUpperCase() === "PM";
  const hour24 = isPM ? (h % 12) + 12 : h % 12;
  return `${String(hour24).padStart(2, "0")}:${m}`;
};

const Events = () => {
  const { data: events = [], isLoading } = useGetEventsQuery();
  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    event_name: "",
    date: "",
    description: "",
    image: null,
  });
  const [time12, setTime12] = useState({ hour12: "", minute: "", period: "AM" });
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const sortedEvents = useMemo(() => {
    const arr = Array.isArray(events) ? [...events] : [];
    arr.sort((a, b) => (b.id || 0) - (a.id || 0));
    return arr;
  }, [events]);

  const resetForm = () => {
    setForm({
      event_name: "",
      date: "",
      description: "",
      image: null,
    });
    setTime12({ hour12: "", minute: "", period: "AM" });
    setImagePreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!form.image) {
      setImagePreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(form.image);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  const handleCreate = async (e) => {
    e.preventDefault();

    const time24 = toTime24(time12);
    if (!form.event_name || !form.date || !time24) {
      toast.error("Event name, date and time are required");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("event_name", form.event_name);
      fd.append("date", form.date);
      fd.append("time", time24);
      fd.append("description", form.description || "");
      if (form.image) fd.append("image", form.image);

      await createEvent(fd).unwrap();
      toast.success("Event created");
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create event");
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this event?");
    if (!ok) return;

    try {
      await deleteEvent(id).unwrap();
      toast.success("Event deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete event");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage events shown in the app.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span className="font-medium">Add Event</span>
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton columns={6} rows={6} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-500">
                      No events found.
                    </td>
                  </tr>
                ) : (
                  sortedEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-900">
                          {ev.event_name || "N/A"}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-1">
                          ID: {ev.id}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {ev.date || "N/A"}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700">
                        {formatTime12(ev.time)}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 max-w-[360px]">
                        <div className="line-clamp-2">
                          {ev.description || (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {ev.image ? (
                          <a
                            href={ev.image}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            View <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-gray-400 italic text-sm">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(ev.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Create Event"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name
            </label>
            <input
              value={form.event_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, event_name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="Dasara Special Offer"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time (12-hour)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={time12.hour12}
                  onChange={(e) =>
                    setTime12((p) => ({ ...p, hour12: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                  required
                >
                  <option value="">HH</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(
                    (h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ),
                  )}
                </select>
                <span className="text-gray-400 font-semibold">:</span>
                <select
                  value={time12.minute}
                  onChange={(e) =>
                    setTime12((p) => ({ ...p, minute: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                  required
                >
                  <option value="">MM</option>
                  {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map(
                    (m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ),
                  )}
                </select>
                <select
                  value={time12.period}
                  onChange={(e) =>
                    setTime12((p) => ({ ...p, period: e.target.value }))
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Will be saved as{" "}
                <span className="font-mono font-semibold text-gray-700">
                  {toTime24(time12) || "HH:mm"}
                </span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary min-h-[110px]"
              placeholder="Join us for a special evening celebration"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 hover:bg-gray-50/70 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Selected"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] text-gray-400 font-semibold">
                        No image
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {form.image?.name || "Upload an image"}
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, WEBP up to ~5MB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        image: e.target.files?.[0] || null,
                      }))
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Choose image
                  </button>
                  {form.image && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          image: null,
                        }))
                      }
                      className="px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Events;

