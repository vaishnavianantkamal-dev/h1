import React from "react";
import {
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  IndianRupee,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { getImageUrl } from "../../../utils/imageUrl";

const ServicesTable = ({
  data,
  categories = [],
  filterData,
  onEdit,
  onDelete,
}) => {
  const filteredData = filterData ? filterData(data) : data;

  const getCategoryName = (categoryId) => {
    if (!categoryId) return "No Category";
    const category = categories.find(
      (c) => String(c.id) === String(categoryId),
    );
    return category ? category.name : `Category ID: ${categoryId}`;
  };

  const getSubscriptionBadgeStyle = (type) => {
    const lowerType = String(type || "").toLowerCase();
    if (lowerType.includes("monthly"))
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (lowerType.includes("instant"))
      return "bg-orange-100 text-orange-700 border-orange-200";
    if (lowerType.includes("one-time") || lowerType.includes("onetime"))
      return "bg-green-100 text-green-700 border-green-200";
    if (lowerType.includes("daily"))
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    return "bg-purple-100 text-purple-700 border-purple-200";
  };

  if (filteredData.length === 0) return null; // Or empty state handled by parent

  return (
    <table className="w-full text-left border-collapse">
      <thead className="bg-gray-50/50 border-b border-gray-100">
        <tr>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Service Name
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Type & Category
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Description / Duration
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Price / Festival
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
            Status
          </th>
          <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase text-right">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {filteredData.map((item) => (
          <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
            <td className="py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                  {(() => {
                    const images = item.images;
                    const icons = item.icons;
                    const icon = item.icon;

                    let imgPath = null;

                    // Try to get from images first
                    if (Array.isArray(images) && images.length > 0) {
                      imgPath = images[0];
                    } else if (typeof images === "string" && images) {
                      imgPath = images;
                    }

                    // Fallback to icons plural
                    if (!imgPath) {
                      if (Array.isArray(icons) && icons.length > 0) {
                        imgPath = icons[0];
                      } else if (typeof icons === "string" && icons) {
                        imgPath = icons;
                      }
                    }

                    // Fallback to icon singular
                    if (!imgPath && typeof icon === "string" && icon) {
                      imgPath = icon;
                    }

                    if (
                      typeof imgPath === "string" &&
                      (imgPath.startsWith("storage/") ||
                        imgPath.startsWith("/storage/") ||
                        imgPath.startsWith("http"))
                    ) {
                      return (
                        <img
                          src={getImageUrl(imgPath)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      );
                    }
                    return <ImageIcon className="text-gray-400" size={20} />;
                  })()}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  {(item.service_group ||
                    item.size_type ||
                    item.size_value) && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[
                        item.service_group,
                        item.size_value && item.size_type
                          ? `${item.size_value} ${item.size_type}`
                          : item.size_type || item.size_value,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td className="py-4 px-6">
              <div className="flex flex-col items-start gap-1.5">
                {(() => {
                  const subName =
                    item.subscription?.name ||
                    (typeof item.type === "object"
                      ? JSON.stringify(item.type)
                      : item.type);
                  return (
                    subName && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSubscriptionBadgeStyle(
                          subName,
                        )}`}
                      >
                        {subName}
                      </span>
                    )
                  );
                })()}
                <span className="text-sm font-medium text-gray-700">
                  {typeof item.category === "object" && item.category !== null
                    ? item.category.name
                    : item.category || getCategoryName(item.category_id)}
                </span>
                {Array.isArray(item.cities) && item.cities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.cities.map((city) => (
                      <span
                        key={city.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200"
                      >
                        {city.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </td>
            <td className="py-4 px-6">
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">
                  {typeof item.description === "object"
                    ? JSON.stringify(item.description)
                    : item.description}
                </span>
                {item.duration_minutes && (
                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Clock size={12} /> {item.duration_minutes} mins
                  </span>
                )}
              </div>
            </td>
            <td className="py-4 px-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                  <IndianRupee size={14} className="text-gray-400" />
                  {Number(item.price).toLocaleString("en-IN")}
                </div>
                {item.festival_price && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    Offer: <IndianRupee size={10} />
                    {Number(item.festival_price).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            </td>
            <td className="py-4 px-6">
              {String(item.status) === "1" || item.status === "Active" ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                  <CheckCircle size={12} /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                  <XCircle size={12} /> Inactive
                </span>
              )}
            </td>
            <td className="py-4 px-6 text-right">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => onEdit && onEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete && onDelete(item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ServicesTable;
