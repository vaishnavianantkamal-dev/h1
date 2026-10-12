import React, { useState, useEffect } from "react";
import { Edit2, Trash2, Plus, X, CalendarDays, IndianRupee } from "lucide-react";
import { toast } from "react-hot-toast";
import TableSkeleton from "../../../components/TableSkeleton";
import {
  useGetServicePlansQuery,
  useCreateServicePlanMutation,
  useUpdateServicePlanMutation,
  useDeleteServicePlanMutation,
  useGetServicesWithPlansQuery,
} from "../../../api/apiSlice";

const EMPTY_FORM = {
  name: "",
  duration_days: "",
  price: "",
  festival_price: "",
  member_price: "",
};

const fmt = (val) =>
  val != null && val !== "" ? `₹${Number(val).toLocaleString("en-IN")}` : "—";

const PlanModal = ({ isOpen, onClose, plan, serviceId, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [createPlan, { isLoading: isCreating }] = useCreateServicePlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdateServicePlanMutation();

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      plan
        ? {
            name: plan.name || "",
            duration_days: plan.duration_days ?? "",
            price: plan.price ?? "",
            festival_price: plan.festival_price ?? "",
            member_price: plan.member_price ?? "",
          }
        : EMPTY_FORM
    );
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const field = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.duration_days || Number(form.duration_days) <= 0)
      return toast.error("Duration must be a positive number");
    if (!form.price || Number(form.price) < 0)
      return toast.error("Price is required");

    const payload = {
      serviceId,
      name: form.name.trim(),
      duration_days: Number(form.duration_days),
      price: Number(form.price),
      ...(form.festival_price !== "" && { festival_price: Number(form.festival_price) }),
      ...(form.member_price !== "" && { member_price: Number(form.member_price) }),
    };

    try {
      if (plan) {
        await updatePlan({ ...payload, planId: plan.id }).unwrap();
        toast.success("Plan updated");
      } else {
        await createPlan(payload).unwrap();
        toast.success("Plan created");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const errors = err?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join(" ")
        : err?.data?.message || "Failed to save plan";
      toast.error(msg);
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {plan ? "Edit Plan" : "Add Plan"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              placeholder="e.g. 1 Month"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (days) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.duration_days}
              onChange={(e) => field("duration_days", e.target.value)}
              placeholder="e.g. 30"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => field("price", e.target.value)}
                placeholder="1000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Festival Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.festival_price}
                onChange={(e) => field("festival_price", e.target.value)}
                placeholder="800"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.member_price}
                onChange={(e) => field("member_price", e.target.value)}
                placeholder="750"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Festival price &amp; Member price are optional — falls back to regular Price if omitted.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-60"
            >
              {isSaving ? "Saving…" : plan ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ServicePlansTable = ({ services = [], categories = [] }) => {
  const activeServices = services.filter((s) => Number(s.status) === 1);

  const getCategoryName = (service) => {
    if (service?.category && typeof service.category === "object")
      return service.category.name || "";
    if (typeof service?.category === "string") return service.category;
    const cat = categories.find(
      (c) => Number(c.id) === Number(service?.category_id),
    );
    return cat?.name || "";
  };
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletePlan] = useDeleteServicePlanMutation();

  const {
    data: plans = [],
    isLoading,
    isFetching,
  } = useGetServicePlansQuery(selectedServiceId, {
    skip: !selectedServiceId,
  });

  const { data: servicesWithPlans = [], isLoading: isOverviewLoading } =
    useGetServicesWithPlansQuery();

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.name}"?`)) return;
    try {
      await deletePlan({ serviceId: selectedServiceId, planId: plan.id }).unwrap();
      toast.success("Plan deleted");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete plan");
    }
  };

  const openAdd = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* Service selector bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <CalendarDays size={16} className="text-gray-400 shrink-0" />
        <label className="text-sm font-medium text-gray-600 shrink-0">Service:</label>
        <select
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          className="flex-1 max-w-xs border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
        >
          <option value="">— Select a service —</option>
          {activeServices.map((s) => {
            const categoryName = getCategoryName(s);
            return (
              <option key={s.id} value={s.id}>
                {categoryName ? `${s.name} (${categoryName})` : s.name}
              </option>
            );
          })}
        </select>

        {selectedServiceId && (
          <button
            onClick={openAdd}
            className="ml-auto flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> Add Plan
          </button>
        )}
      </div>

      {/* Overview: all services that already have plans */}
      {!selectedServiceId && isOverviewLoading && (
        <TableSkeleton columns={4} rows={4} />
      )}

      {!selectedServiceId &&
        !isOverviewLoading &&
        servicesWithPlans.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <CalendarDays size={36} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm">
              No plans added yet. Select a service above to add its first
              billing plan.
            </p>
          </div>
        )}

      {!selectedServiceId &&
        !isOverviewLoading &&
        servicesWithPlans.length > 0 && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                  Service
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                  Category
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">
                  Plans
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {servicesWithPlans.map((sw) => (
                <tr
                  key={sw.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">{sw.name}</div>
                    <div className="text-xs text-gray-500">
                      {(sw.plans || []).length} plan
                      {(sw.plans || []).length === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {sw.category?.name || getCategoryName(sw) || "—"}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {(sw.plans || []).map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium"
                        >
                          {p.name} · {p.duration_days}d · {fmt(p.price)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setSelectedServiceId(String(sw.id))}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Manage plans"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {/* Loading */}
      {selectedServiceId && (isLoading || isFetching) && (
        <TableSkeleton columns={5} rows={4} />
      )}

      {/* Empty plans */}
      {selectedServiceId && !isLoading && !isFetching && plans.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <IndianRupee size={36} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm">No plans yet for this service.</p>
          <button
            onClick={openAdd}
            className="mt-3 text-sm text-primary hover:underline"
          >
            + Add the first plan
          </button>
        </div>
      )}

      {/* Plans table */}
      {selectedServiceId && !isLoading && plans.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Plan</th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Duration</th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Price</th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Festival</th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Member</th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-6">
                  <span className="font-medium text-gray-900">{plan.name}</span>
                </td>
                <td className="py-4 px-6 text-sm text-gray-600">
                  {plan.duration_days} day{plan.duration_days !== 1 ? "s" : ""}
                </td>
                <td className="py-4 px-6 text-sm font-semibold text-gray-900">
                  {fmt(plan.price)}
                </td>
                <td className="py-4 px-6 text-sm text-orange-600">
                  {fmt(plan.festival_price)}
                </td>
                <td className="py-4 px-6 text-sm text-emerald-600">
                  {fmt(plan.member_price)}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(plan)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <PlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        plan={editingPlan}
        serviceId={selectedServiceId}
        onSaved={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default ServicePlansTable;
