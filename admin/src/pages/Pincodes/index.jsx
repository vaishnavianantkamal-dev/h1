import React, { useState } from "react";
import { Plus, Search, MapPin } from "lucide-react";
import {
  useGetPincodesQuery,
  useCreatePincodeMutation,
  useUpdatePincodeMutation,
  useDeletePincodeMutation,
  useGetCitiesQuery,
} from "../../api/apiSlice";
import toast from "react-hot-toast";
import PincodesTable from "./components/PincodesTable";
import PincodeModal from "./components/PincodeModal";

const Pincodes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterActive, setFilterActive] = useState("all"); // 'all', 'true', 'false'
  const perPage = 15;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build query params
  const queryParams = {
    page: currentPage,
    per_page: perPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filterActive !== "all" && { is_active: filterActive }),
  };

  const {
    data: response,
    isLoading,
    refetch,
  } = useGetPincodesQuery(queryParams);
  const [createPincode] = useCreatePincodeMutation();
  const [updatePincode] = useUpdatePincodeMutation();
  const [deletePincode] = useDeletePincodeMutation();
  const { data: cities = [] } = useGetCitiesQuery();

  const pincodes = response?.data || [];
  const meta = response?.meta || { total: 0, last_page: 1 };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedPincode, setSelectedPincode] = useState(null);
  const [formData, setFormData] = useState({
    area: "",
    pincode: "",
    city: "",
    city_id: "",
    is_active: true,
  });

  const handleAddClick = () => {
    setModalMode("add");
    setFormData({
      area: "",
      pincode: "",
      city: "",
      city_id: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (pincode) => {
    setModalMode("edit");
    setSelectedPincode(pincode);
    setFormData({
      area: pincode.area,
      pincode: pincode.pincode,
      city: pincode.city || "",
      city_id: pincode.city_id ?? pincode.city?.id ?? "",
      is_active: pincode.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "add") {
        await createPincode(formData).unwrap();
        toast.success("Pincode added successfully");
      } else {
        await updatePincode({ id: selectedPincode.id, ...formData }).unwrap();
        toast.success("Pincode updated successfully");
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to save pincode:", error);
      toast.error(error?.data?.message || "Failed to save pincode");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this pincode?")) {
      try {
        await deletePincode(id).unwrap();
        toast.success("Pincode deleted successfully");
        refetch();
      } catch (error) {
        console.error("Failed to delete pincode:", error);
        toast.error("Failed to delete pincode");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="text-primary" />
            Serviceable Pincodes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage areas and pincodes where services are available
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={18} />
          <span>Add Pincode</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterActive}
              onChange={(e) => {
                setFilterActive(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="all">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search area or pincode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        <PincodesTable
          pincodes={pincodes}
          isLoading={isLoading}
          onEdit={handleEditClick}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        {!isLoading && meta.last_page > 1 && (
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500 text-center sm:text-left">
              Showing page <span className="font-medium">{currentPage}</span> of{" "}
              <span className="font-medium">{meta.last_page}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(meta.last_page)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    currentPage === i + 1
                      ? "text-white bg-primary shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(meta.last_page, p + 1))
                }
                disabled={currentPage === meta.last_page}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <PincodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSave}
        cities={cities}
      />
    </div>
  );
};

export default Pincodes;
