import React, { useState } from "react";
import { Plus, Edit, Trash2, Search, Filter, Calendar, Tag, Users, TrendingUp, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import {
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} from "../../api/apiSlice";

const Coupons = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);

  const { data: couponsData, isLoading, refetch } = useGetCouponsQuery({
    page: currentPage,
    status: statusFilter === "all" ? null : statusFilter,
    search: searchTerm || null,
  });

  const [createCoupon] = useCreateCouponMutation();
  const [updateCoupon] = useUpdateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();

  const coupons = couponsData?.data || [];
  const pagination = couponsData || {};

  const handleAddClick = () => {
    setCurrentCoupon({
      name: "",
      code: "",
      description: "",
      type: "fixed",
      value: "",
      max_discount: "",
      min_order_amount: "",
      usage_limit: "",
      per_user_limit: 1,
      audience: "all",
      status: true,
      starts_at: "",
      expires_at: "",
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditClick = (coupon) => {
    setCurrentCoupon({
      ...coupon,
      starts_at: coupon.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : "",
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : "",
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (coupon) => {
    if (window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) {
      deleteCoupon(coupon.id)
        .unwrap()
        .then(() => {
          toast.success("Coupon deleted successfully");
          refetch();
        })
        .catch((error) => {
          toast.error("Failed to delete coupon");
          console.error(error);
        });
    }
  };

  const handleSave = async (couponData) => {
    try {
      if (isEditMode && currentCoupon) {
        await updateCoupon({ couponId: currentCoupon.id, couponData }).unwrap();
        toast.success("Coupon updated successfully");
      } else {
        await createCoupon(couponData).unwrap();
        toast.success("Coupon created successfully");
      }
      setIsModalOpen(false);
      setCurrentCoupon(null);
      setIsEditMode(false);
      refetch();
    } catch (error) {
      toast.error(error.data?.message || "Failed to save coupon");
      console.error(error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCoupon(null);
    setIsEditMode(false);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    return status ? (
      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
        Inactive
      </span>
    );
  };

  const getTypeBadge = (type) => {
    return type === "percentage" ? (
      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
        Percentage
      </span>
    ) : (
      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
        Fixed
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Coupon Codes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage discount coupons and promotional codes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
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
          Add Coupon
        </button>
      </div>

      {/* Coupons List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-8 text-center">
            <Tag size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Coupons Found
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all"
                ? "No coupons found matching your criteria."
                : "Create your first coupon to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Coupon Code
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{coupon.code}</div>
                        <div className="text-sm text-gray-500">{coupon.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900">{coupon.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(coupon.type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {coupon.type === "percentage" 
                            ? `${coupon.value}%` 
                            : formatCurrency(coupon.value)}
                        </div>
                        {coupon.max_discount && coupon.type === "percentage" && (
                          <div className="text-gray-500">
                            Max: {formatCurrency(coupon.max_discount)}
                          </div>
                        )}
                        {coupon.min_order_amount && (
                          <div className="text-gray-500">
                            Min: {formatCurrency(coupon.min_order_amount)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-900">
                          <Users size={14} />
                          {coupon.used_count || coupon.usages_count}/{coupon.usage_limit}
                        </div>
                        <div className="text-gray-500">
                          {coupon.per_user_limit} per user
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(coupon.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(coupon)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Coupon"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(coupon)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Coupon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {pagination.last_page}
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === pagination.last_page}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditMode ? "Edit Coupon" : "Add New Coupon"}
        size="lg"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const couponData = {
            name: formData.get('name'),
            code: formData.get('code'),
            description: formData.get('description'),
            type: formData.get('type'),
            value: parseFloat(formData.get('value')),
            max_discount: formData.get('max_discount') ? parseFloat(formData.get('max_discount')) : null,
            min_order_amount: formData.get('min_order_amount') ? parseFloat(formData.get('min_order_amount')) : null,
            usage_limit: parseInt(formData.get('usage_limit')),
            per_user_limit: parseInt(formData.get('per_user_limit')),
            audience: formData.get('audience') || 'all',
            status: formData.get('status') === 'true',
            starts_at: formData.get('starts_at') || null,
            expires_at: formData.get('expires_at') || null,
          };
          handleSave(couponData);
        }} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              defaultValue={currentCoupon?.name || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="e.g., Summer Sale"
              required
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="code"
              defaultValue={currentCoupon?.code || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary uppercase"
              placeholder="e.g., SUMMER20"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={currentCoupon?.description || ""}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary resize-none"
              placeholder="Describe the coupon offer..."
            />
          </div>

          {/* Type and Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                defaultValue={currentCoupon?.type || "fixed"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              >
                <option value="fixed">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="value"
                defaultValue={currentCoupon?.value || ""}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Max Discount and Min Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Discount (for percentage)
              </label>
              <input
                type="number"
                name="max_discount"
                defaultValue={currentCoupon?.max_discount || ""}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Order Amount
              </label>
              <input
                type="number"
                name="min_order_amount"
                defaultValue={currentCoupon?.min_order_amount || ""}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usage Limit <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="usage_limit"
                defaultValue={currentCoupon?.usage_limit || ""}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="Total uses allowed"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Per User Limit <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="per_user_limit"
                defaultValue={currentCoupon?.per_user_limit || 1}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="Uses per user"
                required
              />
            </div>
          </div>

          {/* Audience and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audience
              </label>
              <select
                name="audience"
                defaultValue={currentCoupon?.audience || "all"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                <option value="all">All</option>
                <option value="member">Member</option>
                <option value="new_user">New User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                defaultValue={currentCoupon?.status ? "true" : "false"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="datetime-local"
                name="starts_at"
                defaultValue={currentCoupon?.starts_at || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="datetime-local"
                name="expires_at"
                defaultValue={currentCoupon?.expires_at || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
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
              {isEditMode ? "Update Coupon" : "Create Coupon"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Coupons;
