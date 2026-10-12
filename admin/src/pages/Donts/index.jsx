import React, { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import {
  useGetServicesQuery,
  useGetAllServiceDontsQuery,
  useCreateDontMutation,
  useUpdateDontMutation,
  useDeleteDontMutation,
} from "../../api/apiSlice";

const Donts = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDont, setCurrentDont] = useState(null);

  const { data: services = [] } = useGetServicesQuery();
  const { data: allDonts = [], isLoading, refetch } =
    useGetAllServiceDontsQuery();
  const [createDont] = useCreateDontMutation();
  const [updateDont] = useUpdateDontMutation();
  const [deleteDont] = useDeleteDontMutation();

  // Build de-duplicated service options:
  // - If service_group is present, use it as the label and only show one option per group
  // - If service_group is null, show the individual service name
  const serviceOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    services.forEach((service) => {
      const groupKey = service.service_group || `single-${service.id}`;
      if (seen.has(groupKey)) return;
      seen.add(groupKey);

      options.push({
        id: service.id,
        label: service.service_group || service.name,
      });
    });

    return options;
  }, [services]);

  // Group dos & don'ts by service so each service shows once
  const groupedDonts = useMemo(() => {
    const map = new Map();

    allDonts.forEach((item) => {
      const serviceId = item.service_id;
      if (!serviceId) return;

      if (!map.has(serviceId)) {
        map.set(serviceId, {
          serviceId,
          serviceName:
            item.service?.name ||
            services.find((s) => s.id === serviceId)?.name ||
            "Unknown Service",
          dos: [],
          donts: [],
        });
      }

      const group = map.get(serviceId);
      if (item.type === "do") {
        group.dos.push(item);
      } else {
        group.donts.push(item);
      }
    });

    return Array.from(map.values());
  }, [allDonts, services]);

  const filteredGroups = groupedDonts.filter((group) => {
    const haystack = (
      group.serviceName +
      " " +
      group.dos.map((d) => d.text).join(" ") +
      " " +
      group.donts.map((d) => d.text).join(" ")
    ).toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const handleAddClick = () => {
    setCurrentDont({
      service_id: "",
      type: "dont",
      text: "",
      sort_order: 0,
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (dont) => {
    setCurrentDont({
      ...dont,
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (dont) => {
    if (window.confirm(`Are you sure you want to delete "${dont.text}"?`)) {
      deleteDont(dont.id)
        .unwrap()
        .then(() => {
          toast.success("Don't deleted successfully");
          refetch();
        })
        .catch((error) => {
          toast.error("Failed to delete don't");
          console.error(error);
        });
    }
  };

  const handleSave = async (dontData) => {
    try {
      if (isEditMode && currentDont) {
        await updateDont({
          id: currentDont.id,
          ...dontData,
        }).unwrap();
        toast.success("Don't updated successfully");
      } else {
        await createDont(dontData).unwrap();
        toast.success("Don't created successfully");
      }
      setIsModalOpen(false);
      setCurrentDont(null);
      setIsEditMode(false);
      refetch();
    } catch (error) {
      toast.error(error.data?.message || "Failed to save don't");
      console.error(error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDont(null);
    setIsEditMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Do's and Don'ts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage do's and don'ts for services
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search don'ts..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Add Don't
        </button>
      </div>

      {/* Don'ts List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600">Loading don'ts...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Don'ts Found
            </h3>
            <p className="text-gray-600">
              No do's / don'ts found. Create your first rule for a service.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Do Texts
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Don't Texts
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.map((group) => (
                  <tr
                    key={group.serviceId}
                    className="hover:bg-gray-50/50 transition-colors align-top"
                  >
                    <td className="px-6 py-4">
                      {group.serviceName}
                    </td>
                    <td className="px-6 py-4">
                      {group.dos.length === 0 ? (
                        <span className="text-gray-400 text-sm italic">
                          No Do rules
                        </span>
                      ) : (
                        <ul className="space-y-1 text-sm text-gray-900">
                          {group.dos
                            .slice()
                            .sort(
                              (a, b) =>
                                (a.sort_order ?? 0) - (b.sort_order ?? 0),
                            )
                            .map((item) => (
                              <li
                                key={item.id}
                                className="flex items-start justify-between gap-2"
                              >
                                <span>
                                  <span className="text-xs text-gray-500 mr-1">
                                    #{item.sort_order ?? 0}
                                  </span>
                                  {item.text}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(item)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {group.donts.length === 0 ? (
                        <span className="text-gray-400 text-sm italic">
                          No Don't rules
                        </span>
                      ) : (
                        <ul className="space-y-1 text-sm text-gray-900">
                          {group.donts
                            .slice()
                            .sort(
                              (a, b) =>
                                (a.sort_order ?? 0) - (b.sort_order ?? 0),
                            )
                            .map((item) => (
                              <li
                                key={item.id}
                                className="flex items-start justify-between gap-2"
                              >
                                <span>
                                  <span className="text-xs text-gray-500 mr-1">
                                    #{item.sort_order ?? 0}
                                  </span>
                                  {item.text}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditClick(item)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(item)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-gray-400">
                        {group.dos.length + group.donts.length} rule
                        {group.dos.length + group.donts.length === 1
                          ? ""
                          : "s"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditMode ? "Edit Don't" : "Add New Don't"}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const dontData = {
              service_id: formData.get("service_id"),
              type: formData.get("type"),
              text: formData.get("text"),
              sort_order: parseInt(formData.get("sort_order")) || 0,
            };
            handleSave(dontData);
          }}
          className="space-y-4"
        >
          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service <span className="text-red-500">*</span>
            </label>
            <select
              name="service_id"
              defaultValue={currentDont?.service_id || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Select Service</option>
              {serviceOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type (Do / Don't) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              defaultValue={currentDont?.type || "dont"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              required
            >
              <option value="do">Do</option>
              <option value="dont">Don't</option>
            </select>
          </div>

          {/* Don't Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Don't Text <span className="text-red-500">*</span>
            </label>
            <textarea
              name="text"
              defaultValue={currentDont?.text || ""}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary resize-none"
              placeholder="Enter don't text (e.g., Keep the area clear for cleaning)"
              required
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <input
              type="number"
              name="sort_order"
              defaultValue={currentDont?.sort_order || 0}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="Enter sort order (0 for first)"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors"
            >
              {isEditMode ? "Update Don't" : "Create Don't"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Donts;
