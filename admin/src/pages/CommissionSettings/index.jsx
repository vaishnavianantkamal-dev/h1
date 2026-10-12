import React, { useState, useMemo } from "react";
import {
  Download,
  Search,
  Plus,
  Edit2,
  Trash2,
  Percent,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Save,
} from "lucide-react";
import { toast } from "react-hot-toast";
import StatsGrid from "../../components/StatsGrid";
import FilterBar from "../../components/FilterBar";
import Modal from "../../components/Modal";
import TableSkeleton from "../../components/TableSkeleton";
import {
  useGetCommissionsQuery,
  useGetCommissionSummaryQuery,
  useCreateCommissionMutation,
  useUpdateCommissionMutation,
  useDeleteCommissionMutation,
  useGetServicesQuery,
} from "../../api/apiSlice";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format } from "date-fns";

const CommissionSettings = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [selectedCommission, setSelectedCommission] = useState(null);

  const { data: services = [] } = useGetServicesQuery();
  const { data: commissions = [], isLoading } = useGetCommissionsQuery();
  const { data: summaryData } = useGetCommissionSummaryQuery();
  const [createCommission] = useCreateCommissionMutation();
  const [updateCommission] = useUpdateCommissionMutation();
  const [deleteCommission] = useDeleteCommissionMutation();

  const [formData, setFormData] = useState({
    serviceId: "",
    type: "percentage",
    value: "",
    status: "active",
  });

  const statuses = ["All", "Active", "Inactive"];

  const filteredCommissions = useMemo(() => {
    return commissions.filter((item) => {
      const service = services.find(
        (s) => s.id.toString() === item.serviceId.toString(),
      );
      const serviceName = service ? service.name : "Unknown Service";

      const matchesSearch =
        serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.id &&
          item.id.toString().toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [commissions, services, searchTerm, statusFilter]);

  const handleAddClick = () => {
    setModalMode("add");
    setFormData({
      serviceId: "",
      type: "percentage",
      value: "",
      status: "active",
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (commission) => {
    setModalMode("edit");
    setSelectedCommission(commission);
    setFormData({
      serviceId: commission.serviceId,
      type: commission.type,
      value: commission.value,
      status: commission.status,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this commission rule?")
    ) {
      try {
        await deleteCommission(id).unwrap();
        toast.success("Commission rule deleted successfully");
      } catch (error) {
        console.error("Failed to delete commission rule:", error);
        toast.error("Failed to delete commission rule");
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Create payload matching API requirements (snake_case)
      const payload = {
        service_id: formData.serviceId,
        commission_type: formData.type,
        value: formData.value,
        status: formData.status.toLowerCase(),
      };

      if (modalMode === "add") {
        await createCommission(payload).unwrap();
        toast.success("Commission rule created successfully");
      } else {
        await updateCommission({
          id: selectedCommission.id,
          ...payload,
        }).unwrap();
        toast.success("Commission rule updated successfully");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save commission rule:", error);
      toast.error("Failed to save commission rule");
    }
  };

  const handleExportReport = () => {
    if (!filteredCommissions || filteredCommissions.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = filteredCommissions.map((item) => {
      const service = services.find(
        (s) => s.id.toString() === item.serviceId.toString(),
      );
      const serviceName = service ? service.name : "Unknown Service";

      return {
        "Rule ID": item.id,
        Service: serviceName,
        "Commission Type": item.type,
        Value: item.type === "percentage" ? `${item.value}%` : `₹${item.value}`,
        Status: item.status,
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Commissions");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(
      data,
      `commissions_report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`,
    );
  };

  const statsData = [
    {
      label: "Avg. Commission",
      value: summaryData?.average_commission
        ? `${parseFloat(summaryData.average_commission).toFixed(1)}%`
        : "0%",
      icon: Percent,
      colorClass: "text-primary",
    },
    {
      label: "Active Rules",
      value: commissions.filter((c) => c.status === "Active").length,
      icon: TrendingUp,
      colorClass: "text-green-600",
    },
    {
      label: "Total Commission",
      value: summaryData?.total_company_commission
        ? `₹ ${parseFloat(summaryData.total_company_commission).toLocaleString(
            "en-IN",
            { maximumFractionDigits: 2 },
          )}`
        : "₹ 0",
      icon: DollarSign,
      colorClass: "text-blue-600",
    },
  ];

  const filterTabs = statuses.map((status) => ({
    id: status,
    label: status,
  }));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Commission Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage platform fees and commission rates per category
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportReport}
            className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={20} />
            <span className="font-medium hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleAddClick}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span className="font-medium">Add Rule</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={statsData} />

      {/* Filter Bar */}
      <FilterBar
        tabs={filterTabs}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search service or ID..."
      />

      {/* Commissions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rule ID
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Commission Type
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCommissions.map((item) => {
                    const service = services.find(
                      (s) => s.id.toString() === item.serviceId.toString(),
                    );
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-900">
                            {item.id}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-900">
                            {service ? service.name : "Unknown Service"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 border border-gray-100">
                            {item.type === "percentage" ? (
                              <Percent size={12} />
                            ) : (
                              <DollarSign size={12} />
                            )}
                            {item.type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-gray-900">
                            {item.type === "percentage"
                              ? `${item.value}%`
                              : `₹${item.value}`}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              item.status === "Active"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-gray-50 text-gray-700 border-gray-100"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredCommissions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No commission rules found matching your criteria.
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === "add" ? "Add Commission Rule" : "Edit Commission Rule"
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service
            </label>
            <select
              required
              value={formData.serviceId}
              onChange={(e) =>
                setFormData({ ...formData, serviceId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select Service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={formData.type === "percentage" ? "15" : "50"}
              />
            </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CommissionSettings;
