import React, { useState } from "react";
import { Edit, Trash2, Plus, Image as ImageIcon, CheckCircle, XCircle } from "lucide-react";
import { getImageUrl } from "../../../utils/imageUrl";
import toast from "react-hot-toast";

const AddOnsTable = ({
  addOns = [],
  isLoading = false,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const getStatusColor = (status) => {
    return status === 1 ||
      status === "1" ||
      status === true ||
      status === "true" ||
      status === "Active" ||
      status === "active"
      ? "bg-green-50 text-green-700 border-green-100"
      : "bg-red-50 text-red-700 border-red-100";
  };

  const getStatusIcon = (status) => {
    return status === 1 ||
      status === "1" ||
      status === true ||
      status === "true" ||
      status === "Active" ||
      status === "active"
      ? <CheckCircle size={16} className="text-green-600" />
      : <XCircle size={16} className="text-red-600" />;
  };

  const getStatusText = (status) => {
    return status === 1 ||
      status === "1" ||
      status === true ||
      status === "true" ||
      status === "Active" ||
      status === "active"
      ? "Active"
      : "Inactive";
  };

  const handleDelete = (addOn) => {
    if (window.confirm(`Are you sure you want to delete "${addOn.name}"?`)) {
      onDelete(addOn.id);
    }
  };

  const formatPrice = (price) => {
    if (!price) return "₹0";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (addOns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <ImageIcon size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Add-ons Found</h3>
        <p className="text-gray-600 mb-6">Get started by adding your first add-on service</p>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          Add First Add-on
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addOns.map((addOn) => (
        <div
          key={addOn.id}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow text-sm"
        >
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Images */}
            <div className="flex-shrink-0">
              <div className="flex gap-2">
                {addOn.images && addOn.images.length > 0 ? (
                  addOn.images.slice(0, 2).map((image, index) => (
                    <div
                      key={index}
                      className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                    >
                      {!imageErrors[addOn.id] ? (
                        <img
                          src={getImageUrl(image)}
                          alt={`${addOn.name} image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(addOn.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                    <ImageIcon size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {addOn.name || "Unnamed Add-on"}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {addOn.description || "No description available"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                    addOn.status
                  )}`}
                >
                  {getStatusIcon(addOn.status)}
                  {getStatusText(addOn.status)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xl font-bold text-primary">
                  {formatPrice(addOn.price)}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(addOn)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Add-on"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(addOn)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Add-on"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AddOnsTable;
