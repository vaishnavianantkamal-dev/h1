import React, { useState } from "react";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Building2,
  Map,
  Navigation,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import ListSkeleton from "../../components/ListSkeleton";
import {
  useGetCitiesQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
  useDeleteCityMutation,
  useGetZonesQuery,
  useCreateZoneMutation,
  useUpdateZoneMutation,
  useDeleteZoneMutation,
  useGetServiceableAreasQuery,
  useCreateServiceableAreaMutation,
  useUpdateServiceableAreaMutation,
  useDeleteServiceableAreaMutation,
} from "../../api/apiSlice";

const LocationZoneSetup = () => {
  // --- State Management ---
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'city' | 'zone' | 'area'
    mode: null, // 'add' | 'edit'
    data: null,
  });

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    pincode: "",
    status: "Active",
    city_id: "",
    zone_id: "",
  });

  // --- RTK Query Hooks ---
  const { data: cities = [], isLoading: citiesLoading } = useGetCitiesQuery();
  const [createCity] = useCreateCityMutation();
  const [updateCity] = useUpdateCityMutation();
  const [deleteCity] = useDeleteCityMutation();

  const { data: zones = [], isLoading: zonesLoading } = useGetZonesQuery();
  const [createZone] = useCreateZoneMutation();
  const [updateZone] = useUpdateZoneMutation();
  const [deleteZone] = useDeleteZoneMutation();

  const { data: areas = [], isLoading: areasLoading } =
    useGetServiceableAreasQuery();
  const [createArea] = useCreateServiceableAreaMutation();
  const [updateArea] = useUpdateServiceableAreaMutation();
  const [deleteArea] = useDeleteServiceableAreaMutation();

  // --- Filtered Data ---
  const filteredZones = zones.filter(
    (z) => String(z.city_id) === String(selectedCityId),
  );
  const filteredAreas = areas.filter(
    (a) => String(a.zone_id) === String(selectedZoneId),
  );

  // --- Handlers ---
  const handleCitySelect = (id) => {
    setSelectedCityId(id);
    setSelectedZoneId(null); // Reset zone selection when city changes
  };

  const handleZoneSelect = (id) => {
    setSelectedZoneId(id);
  };

  const openModal = (type, mode, data = null) => {
    setModalState({ isOpen: true, type, mode, data });
    if (mode === "edit" && data) {
      setFormData({
        name: data.name,
        code: data.code || "",
        pincode: data.pincode || "",
        status: data.status,
        city_id: data.city_id || "",
        zone_id: data.zone_id || "",
      });
    } else {
      setFormData({
        name: "",
        code: "",
        pincode: "",
        status: "Active",
        city_id: selectedCityId || "",
        zone_id: selectedZoneId || "",
      });
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, mode: null, data: null });
    setFormData({
      name: "",
      code: "",
      pincode: "",
      status: "Active",
      city_id: "",
      zone_id: "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    if (!formData.name.trim()) return false;
    if (modalState.type === "zone" && !formData.city_id) return false;
    if (modalState.type === "area" && !formData.zone_id) return false;
    return true;
  };

  const handleSave = async () => {
    const { type, mode, data } = modalState;
    try {
      if (type === "city") {
        const payload = { name: formData.name };
        if (mode === "add") {
          await createCity(payload).unwrap();
          toast.success("City created successfully");
        } else {
          await updateCity({ id: data.id, ...payload }).unwrap();
          toast.success("City updated successfully");
        }
      } else if (type === "zone") {
        const payload = {
          name: formData.name,
          city_id: Number(formData.city_id),
        };
        if (mode === "add") {
          await createZone(payload).unwrap();
          toast.success("Zone created successfully");
        } else {
          await updateZone({ id: data.id, ...payload }).unwrap();
          toast.success("Zone updated successfully");
        }
      } else if (type === "area") {
        const payload = {
          name: formData.name,
          zone_id: Number(formData.zone_id),
        };
        if (mode === "add") {
          await createArea(payload).unwrap();
          toast.success("Area created successfully");
        } else {
          await updateArea({ id: data.id, ...payload }).unwrap();
          toast.success("Area updated successfully");
        }
      }
      closeModal();
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save changes");
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      if (type === "city") {
        await deleteCity(id).unwrap();
        toast.success("City deleted successfully");
        if (selectedCityId === id) {
          setSelectedCityId(null);
          setSelectedZoneId(null);
        }
      } else if (type === "zone") {
        await deleteZone(id).unwrap();
        toast.success("Zone deleted successfully");
        if (selectedZoneId === id) setSelectedZoneId(null);
      } else if (type === "area") {
        await deleteArea(id).unwrap();
        toast.success("Area deleted successfully");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete item");
    }
  };

  // --- Render Helpers ---
  const renderListItem = (item, type, isSelected, onSelect) => (
    <div
      key={item.id}
      onClick={() => onSelect && onSelect(item.id)}
      className={`p-4 border-b border-gray-100 last:border-0 flex items-center justify-between cursor-pointer transition-colors group ${
        isSelected
          ? "bg-blue-50 border-l-4 border-l-primary"
          : "hover:bg-gray-50 border-l-4 border-l-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${isSelected ? "bg-blue-100 text-primary" : "bg-gray-100 text-gray-500"}`}
        >
          {type === "city" && <Building2 size={18} />}
          {type === "zone" && <Map size={18} />}
          {type === "area" && <MapPin size={18} />}
        </div>
        <div>
          <h3
            className={`font-medium ${isSelected ? "text-primary" : "text-gray-900"}`}
          >
            {item.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {item.status && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  item.status === "Active" || item.status === 1
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {item.status === 1 ? "Active" : item.status}
              </span>
            )}
            {item.code && <span>• Code: {item.code}</span>}
            {item.pincode && <span>• PIN: {item.pincode}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openModal(type, "edit", item);
          }}
          className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-primary transition-colors"
          title="Edit"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(type, item.id);
          }}
          className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-red-600 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
        {onSelect && <ChevronRight size={16} className="text-gray-400 ml-1" />}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Location & Zone Setup
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage hierarchical structure of Cities, Zones, and Areas
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Column 1: Cities */}
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-gray-700" />
              <h2 className="font-semibold text-gray-900">Cities</h2>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                {cities.length}
              </span>
            </div>
            <button
              onClick={() => openModal("city", "add")}
              className="p-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              title="Add City"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {citiesLoading ? (
              <ListSkeleton count={5} />
            ) : cities.length > 0 ? (
              cities.map((city) =>
                renderListItem(
                  city,
                  "city",
                  selectedCityId === city.id,
                  handleCitySelect,
                ),
              )
            ) : (
              <div className="p-8 text-center text-gray-500">
                No cities found. Add one to get started.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Zones */}
        <div
          className={`flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full ${!selectedCityId ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Map size={18} className="text-gray-700" />
              <h2 className="font-semibold text-gray-900">Zones</h2>
              {selectedCityId && (
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {filteredZones.length}
                </span>
              )}
            </div>
            <button
              onClick={() => openModal("zone", "add")}
              disabled={!selectedCityId}
              className="p-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-300"
              title="Add Zone"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {!selectedCityId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                <Navigation size={48} className="mb-3 opacity-20" />
                <p>Select a City to manage Zones</p>
              </div>
            ) : zonesLoading ? (
              <ListSkeleton count={6} />
            ) : filteredZones.length > 0 ? (
              filteredZones.map((zone) =>
                renderListItem(
                  zone,
                  "zone",
                  selectedZoneId === zone.id,
                  handleZoneSelect,
                ),
              )
            ) : (
              <div className="p-8 text-center text-gray-500">
                No zones found for this city.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Areas */}
        <div
          className={`flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full ${!selectedZoneId ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-gray-700" />
              <h2 className="font-semibold text-gray-900">Areas</h2>
              {selectedZoneId && (
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {filteredAreas.length}
                </span>
              )}
            </div>
            <button
              onClick={() => openModal("area", "add")}
              disabled={!selectedZoneId}
              className="p-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-300"
              title="Add Area"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {!selectedZoneId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                <MapPin size={48} className="mb-3 opacity-20" />
                <p>Select a Zone to manage Areas</p>
              </div>
            ) : areasLoading ? (
              <ListSkeleton count={5} />
            ) : filteredAreas.length > 0 ? (
              filteredAreas.map((area) =>
                renderListItem(area, "area", false, null),
              )
            ) : (
              <div className="p-8 text-center text-gray-500">
                No areas found for this zone.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={`${modalState.mode === "add" ? "Add" : "Edit"} ${modalState.type ? modalState.type.charAt(0).toUpperCase() + modalState.type.slice(1) : ""}`}
      >
        <div className="space-y-4">
          {modalState.type === "zone" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                name="city_id"
                value={formData.city_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {modalState.type === "area" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone
              </label>
              <select
                name="zone_id"
                value={formData.zone_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">Select Zone</option>
                {filteredZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder={`Enter ${modalState.type} name`}
              autoFocus
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LocationZoneSetup;
