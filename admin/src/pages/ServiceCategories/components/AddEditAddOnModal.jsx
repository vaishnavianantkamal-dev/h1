import React, { useState, useEffect } from "react";
import { X, Upload, Image as ImageIcon, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getImageUrl } from "../../../utils/imageUrl";
import Modal from "../../../components/Modal";

const AddEditAddOnModal = ({
  isOpen,
  onClose,
  addOn,
  onSave,
  isLoading = false,
}) => {
  const normalizeStatus = (status) => {
    if (status === true || status === "true") return "1";
    if (status === false || status === "false") return "0";
    if (status === 1 || status === "1" || status === "Active" || status === "active") {
      return "1";
    }
    if (status === 0 || status === "0" || status === "Inactive" || status === "inactive") {
      return "0";
    }
    return "1";
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    status: "1",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (addOn) {
      setFormData({
        name: addOn.name || "",
        description: addOn.description || "",
        price: addOn.price || "",
        status: normalizeStatus(addOn.status),
      });

      // Set existing images
      if (addOn.images && addOn.images.length > 0) {
        const previews = addOn.images.map((image) => ({
          url: getImageUrl(image),
          file: null,
          existing: true,
        }));
        setImagePreviews(previews);
      }
    } else {
      // Reset form for new add-on
      setFormData({
        name: "",
        description: "",
        price: "",
        status: "1",
      });
      setImagePreviews([]);
      setImageFiles([]);
    }
  }, [addOn, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePriceChange = (e) => {
    const formatted = formatPrice(e.target.value);
    setFormData((prev) => ({
      ...prev,
      price: formatted,
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    const newPreviews = validFiles.map((file) => ({
      url: URL.createObjectURL(file),
      file,
      existing: false,
    }));

    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setImageFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeImage = (index) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);

    const newFiles = newPreviews
      .filter((preview) => !preview.existing)
      .map((preview) => preview.file);
    setImageFiles(newFiles);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Add-on name is required");
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }

    // Create FormData for file upload
    const submitData = new FormData();
    submitData.append("name", formData.name.trim());
    submitData.append("description", formData.description.trim());
    submitData.append("price", formData.price);
    submitData.append("status", formData.status);

    // Add images
    imageFiles.forEach((file) => {
      submitData.append("images[]", file);
    });

    onSave(submitData);
  };

  const formatPrice = (value) => {
    const num = value.replace(/[^\d.]/g, "");
    return num;
  };

  const getModalTitle = () => {
    return addOn ? "Edit Add-on" : "Add New Add-on";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add-on Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="e.g., Extra Bathroom"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handlePriceChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="0"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary resize-none"
            placeholder="Describe the add-on service..."
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Images
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-gray-400"
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <Upload size={48} className="text-gray-400 mb-3" />
              <span className="text-sm text-gray-600 mb-2">
                Drag & drop images here, or click to browse
              </span>
              <span className="text-xs text-gray-500">
                PNG, JPG, GIF up to 5MB each
              </span>
            </label>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview.url}
                    alt={`Preview ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : addOn ? "Update Add-on" : "Create Add-on"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddEditAddOnModal;
