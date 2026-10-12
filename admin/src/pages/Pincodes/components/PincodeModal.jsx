import React from "react";
import Modal from "../../../components/Modal";

const PincodeModal = ({
  isOpen,
  onClose,
  mode,
  formData,
  setFormData,
  onSubmit,
  cities = [],
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Add New Pincode" : "Edit Pincode"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Area Name
          </label>
          <input
            type="text"
            required
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary outline-none"
            placeholder="e.g. Gangapur Road"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pincode
          </label>
          <input
            type="text"
            required
            pattern="[0-9]{6}"
            title="Please enter a valid 6-digit pincode"
            value={formData.pincode}
            onChange={(e) =>
              setFormData({ ...formData, pincode: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary outline-none font-mono"
            placeholder="e.g. 422102"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <select
            required
            value={formData.city_id || ""}
            onChange={(e) => {
              const id = e.target.value;
              const selected = cities.find(
                (c) => String(c.id) === String(id),
              );
              setFormData({
                ...formData,
                city_id: id,
                city: selected ? selected.name : "",
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary outline-none bg-white"
          >
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData({ ...formData, is_active: e.target.checked })
            }
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label
            htmlFor="is_active"
            className="text-sm font-medium text-gray-700 cursor-pointer"
          >
            Active (Serviceable)
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            {mode === "add" ? "Add Pincode" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PincodeModal;
