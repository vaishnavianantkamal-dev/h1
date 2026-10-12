import React, { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import Modal from "../../components/Modal";
import { getImageUrl } from "../../utils/imageUrl";

const UserModal = ({
  isOpen,
  onClose,
  mode,
  formData,
  setFormData,
  onSubmit,
  roles,
  cities = [],
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleAddImage = () => {
    setFormData({
      ...formData,
      newImages: [...(formData.newImages || []), { type: "", file: null }],
    });
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...formData.images];
    updatedImages.splice(index, 1);
    setFormData({ ...formData, images: updatedImages });
  };

  const handleRemoveNewImage = (index) => {
    const updatedNewImages = [...(formData.newImages || [])];
    updatedNewImages.splice(index, 1);
    setFormData({ ...formData, newImages: updatedNewImages });
  };

  const handleImageChange = (index, field, value) => {
    const updatedNewImages = [...(formData.newImages || [])];

    // File size validation for 'file' field
    if (field === "file" && value) {
      const fileSizeMB = value.size / (1024 * 1024);
      if (fileSizeMB > 2) {
        updatedNewImages[index] = {
          ...updatedNewImages[index],
          [field]: null,
          error: "File size must be less than 2MB",
        };
        setFormData({ ...formData, newImages: updatedNewImages });
        return;
      }
    }

    // Clear error if valid or if other fields change
    updatedNewImages[index] = {
      ...updatedNewImages[index],
      [field]: value,
      error: null,
    };
    setFormData({ ...formData, newImages: updatedNewImages });
  };

  const selectedRoleName =
    roles.find((r) => r.id === Number(formData.role_id))?.roleName || "";
  const lowerRoleName = selectedRoleName.toLowerCase();
  const isContractor = lowerRoleName.includes("contractor");
  // City is mandatory for city-scoped roles (City Admin / Coordinator).
  const requiresCity =
    lowerRoleName.includes("city") ||
    lowerRoleName.includes("coordinator") ||
    lowerRoleName.includes("co-ordinator");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Add New User" : "Edit User"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {isContractor && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firm Name
            </label>
            <input
              type="text"
              required={isContractor}
              value={formData.firm || ""}
              onChange={(e) =>
                setFormData({ ...formData, firm: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="Enter firm name"
            />
          </div>
        )}
        <div className="space-y-3 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              User Documents/Images
            </label>
            <button
              type="button"
              onClick={handleAddImage}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              + Add Image
            </button>
          </div>

          {/* Existing Images Section */}
          {mode === "edit" && formData.images && formData.images.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500">
                Existing Documents:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {formData.images.map((img, index) => (
                  <div
                    key={index}
                    className="relative group bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                  >
                    <img
                      src={getImageUrl(img.path)}
                      alt={img.type}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                      <p className="text-white text-xs font-bold text-center truncate">
                        {img.type}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Images Section */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500">
              Add New Documents:
            </p>
            {(formData.newImages || []).map((img, index) => (
              <div key={index} className="space-y-1">
                <div
                  className={`grid grid-cols-12 gap-2 items-start bg-white p-2 rounded-lg border ${
                    img.error ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                >
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Type (e.g. Aadhar)"
                      value={img.type}
                      onChange={(e) =>
                        handleImageChange(index, "type", e.target.value)
                      }
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  <div className="col-span-6">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageChange(index, "file", e.target.files[0])
                      }
                      className="w-full text-xs file:mr-2 file:py-1.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      required
                    />
                  </div>
                  <div className="col-span-1 pt-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                {img.error && (
                  <div className="flex items-center gap-1 text-[10px] text-red-600 font-medium px-1">
                    <AlertCircle size={10} />
                    {img.error}
                  </div>
                )}
              </div>
            ))}

            {(formData.newImages || []).length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-2">
                No new images to upload. Click "+ Add Image" to start.
              </p>
            )}
          </div>

          {(formData.images || []).length === 0 &&
            (formData.newImages || []).length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-2">
                No documents added yet. Click "+ Add Image" to upload.
              </p>
            )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              value={formData.password_confirmation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  password_confirmation: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign Role
          </label>
          <select
            value={formData.role_id}
            onChange={(e) =>
              setFormData({ ...formData, role_id: Number(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roleName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City{" "}
            {requiresCity && <span className="text-red-500">*</span>}
          </label>
          <select
            required={requiresCity}
            value={formData.city_id || ""}
            onChange={(e) =>
              setFormData({ ...formData, city_id: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
          >
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          {requiresCity && (
            <p className="text-xs text-gray-400 mt-1">
              Required for City Admin and Coordinator roles.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-primary rounded-lg"
          >
            {mode === "add" ? "Create User" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
