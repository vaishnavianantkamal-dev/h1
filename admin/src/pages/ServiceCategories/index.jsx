import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Layers,
  Grid,
  Award,
  Package,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import CategoriesTable from "./components/CategoriesTable";
import ServicesTable from "./components/ServicesTable";
import SubscriptionTypesTable from "./components/SubscriptionTypesTable";
import AddOnsTable from "./components/AddOnsTable";
import AddEditAddOnModal from "./components/AddEditAddOnModal";
import ServicePlansTable from "./components/ServicePlansTable";
import CheckboxGroup from "./components/CheckboxGroup";
import Modal from "../../components/Modal";
import TableSkeleton from "../../components/TableSkeleton";
import CityFilter from "../../components/CityFilter";
import apiClient from "../../api/client";
import { getImageUrl } from "../../utils/imageUrl";
import {
  useGetServiceCategoriesQuery,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  useDeleteServiceCategoryMutation,
  useGetServicesQuery,
  useGetServicesByCategoryQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useGetSubscriptionTypesQuery,
  useCreateSubscriptionTypeMutation,
  useUpdateSubscriptionTypeMutation,
  useDeleteSubscriptionTypeMutation,
  useGetAddOnsQuery,
  useCreateAddOnMutation,
  useUpdateAddOnMutation,
  useDeleteAddOnMutation,
  useGetCitiesQuery,
} from "../../api/apiSlice";

const ServiceCategories = () => {
  const [activeTab, setActiveTab] = useState("categories");
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceCityFilter, setServiceCityFilter] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    service: "",
    type: "",
    price: "",
    description: "",
    level: "",
    status: "Active",
    slug: "",
    icon: "",
    icons: [],
    images: "",
    service_group: "",
    size_type: "",
    size_value: "",
    subscription_ids: [],
    city_ids: [],
  });
  const [iconFiles, setIconFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);

  // --- RTK Query Hooks ---
  const { data: categories = [], isLoading: categoriesLoading } =
    useGetServiceCategoriesQuery();
  const [createCategory] = useCreateServiceCategoryMutation();
  const [updateCategory] = useUpdateServiceCategoryMutation();
  const [deleteCategory] = useDeleteServiceCategoryMutation();

  const {
    data: services = [],
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = useGetServicesQuery(
    serviceCityFilter ? { city_id: serviceCityFilter } : undefined,
  );

  const {
    data: servicesByCategory = [],
    isLoading: servicesByCategoryLoading,
    refetch: refetchServicesByCategory,
  } = useGetServicesByCategoryQuery(selectedCategoryId, {
    skip: !selectedCategoryId,
  });

  // Use category-filtered services when category is selected, otherwise use all services
  const displayServices = selectedCategoryId ? servicesByCategory : services;
  const servicesLoadingState = selectedCategoryId
    ? servicesByCategoryLoading
    : servicesLoading;
  const [createService] = useCreateServiceMutation();
  const [updateService] = useUpdateServiceMutation();
  const [deleteService] = useDeleteServiceMutation();

  const { data: subscriptionTypes = [], isLoading: subscriptionTypesLoading } =
    useGetSubscriptionTypesQuery();
  const [createSubscriptionType] = useCreateSubscriptionTypeMutation();
  const [updateSubscriptionType] = useUpdateSubscriptionTypeMutation();
  const [deleteSubscriptionType] = useDeleteSubscriptionTypeMutation();

  const {
    data: addOns = [],
    isLoading: addOnsLoading,
    refetch: refetchAddOns,
  } = useGetAddOnsQuery();
  const [createAddOn] = useCreateAddOnMutation();
  const [updateAddOn] = useUpdateAddOnMutation();
  const [deleteAddOn] = useDeleteAddOnMutation();

  const { data: cities = [], isLoading: citiesLoading } = useGetCitiesQuery();

  // Add-on modal state
  const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
  const [currentAddOn, setCurrentAddOn] = useState(null);

  // Helper function to filter data based on search term
  const filterData = (data) => {
    if (!data) return [];
    return data.filter((item) => {
      const categoryName =
        typeof item.category === "object" && item.category !== null
          ? item.category.name
          : item.category;

      return (
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (categoryName &&
          categoryName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.type &&
          item.type.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeTab === id
          ? "bg-gray-900 text-white shadow-md"
          : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  const handleAddClick = () => {
    setIsEditMode(false);
    setCurrentEditId(null);
    setFormData({
      name: "",
      category: "",
      category_id: "",
      service: "",
      type: "",
      price: "",
      festival_price: "",
      member_price: "",
      duration_minutes: "",
      description: "",
      level: "",
      status: "Active",
      slug: "",
      icon: "",
      icons: [],
      images: "",
      service_group: "",
      size_type: "",
      size_value: "",
      subscription_ids: [],
      city_ids: [],
    });
    setIconFiles([]);
    setImageFiles([]);
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    setIsEditMode(true);
    setCurrentEditId(item.id);
    setFormData({
      name: item.name || "",
      category: item.category || "",
      category_id: item.category_id || "",
      service: item.service || "",
      type: item.type || "",
      price: item.price || "",
      festival_price: item.festival_price || "",
      member_price: item.member_price || "",
      duration_minutes: item.duration_minutes || "",
      description: item.description || "",
      level: item.level || "",
      status:
        item.status === 1 || item.status === "1" || item.status === "Active"
          ? "Active"
          : "Inactive",
      slug: item.slug || "",
      icon: item.icon || "",
      icons: Array.isArray(item.icons)
        ? item.icons
        : typeof item.icon === "string" && item.icon.includes(",")
          ? item.icon
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : item.icon
            ? [item.icon]
            : [],
      images: Array.isArray(item.images)
        ? item.images.join(",")
        : item.images || "",
      service_group: item.service_group || "",
      size_type: item.size_type || "",
      size_value: item.size_value || "",
      subscription_ids: Array.isArray(item.subscription_ids)
        ? item.subscription_ids.map((sid) => Number(sid))
        : Array.isArray(item.subscriptions)
          ? item.subscriptions.map((sub) =>
              Number(typeof sub === "object" && sub !== null ? sub.id : sub),
            )
          : item.subscription?.id != null
            ? [Number(item.subscription.id)]
            : item.subscription_id != null && item.subscription_id !== "0"
              ? [Number(item.subscription_id)]
              : [],
      city_ids: Array.isArray(item.cities)
        ? item.cities.map((c) =>
            Number(typeof c === "object" && c !== null ? c.id : c),
          )
        : Array.isArray(item.city_ids)
          ? item.city_ids.map((cid) => Number(cid))
          : [],
    });
    setIconFiles([]);
    setImageFiles([]);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        if (activeTab === "categories") {
          await deleteCategory(id).unwrap();
          toast.success("Category deleted successfully");
        } else if (activeTab === "services") {
          await deleteService(id).unwrap();
          toast.success("Service deleted successfully");
        } else if (activeTab === "subscription-types") {
          await deleteSubscriptionType(id).unwrap();
          toast.success("Subscription Type deleted successfully");
        } else if (activeTab === "add-ons") {
          await deleteAddOn(id).unwrap();
          toast.success("Add-on deleted successfully");
        }
      } catch (error) {
        toast.error(
          error?.status === 409
            ? "This item is used in bookings/commissions, so it can't be deleted. Set it to Inactive instead."
            : error?.status === "FETCH_ERROR"
              ? "Server not reachable. Check that the backend is running."
              : error?.data?.message || "Failed to delete item"
        );
        console.error(error);
      }
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategoryId(category.id);
    setActiveTab("services");
  };

  const handleBackToCategories = () => {
    setSelectedCategoryId(null);
    setActiveTab("categories");
  };

  // Add-on handlers
  const handleAddAddOn = () => {
    setCurrentAddOn(null);
    setIsAddOnModalOpen(true);
  };

  const handleEditAddOn = (addOn) => {
    setCurrentAddOn(addOn);
    setIsAddOnModalOpen(true);
  };

  const handleSaveAddOn = async (formData) => {
    try {
      if (currentAddOn) {
        await updateAddOn({ id: currentAddOn.id, data: formData }).unwrap();
        toast.success("Add-on updated successfully");
      } else {
        await createAddOn(formData).unwrap();
        toast.success("Add-on created successfully");
      }
      setIsAddOnModalOpen(false);
      setCurrentAddOn(null);
      refetchAddOns();
    } catch (error) {
      toast.error(error.data?.message || "Failed to save add-on");
      console.error(error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Generic toggle for any array-of-ids field (subscription_ids, city_ids).
  const handleMultiSelectToggle = (field, id) => {
    const numId = Number(id);
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(numId);
      return {
        ...prev,
        [field]: exists
          ? current.filter((x) => x !== numId)
          : [...current, numId],
      };
    });
  };

  const handleSubscriptionToggle = (id) =>
    handleMultiSelectToggle("subscription_ids", id);

  const handleCityToggle = (id) => handleMultiSelectToggle("city_ids", id);

  const handleAddIcon = () => {
    const val = (formData.icon || "").trim();
    if (!val) return;
    if (formData.icons.some((i) => i === val)) {
      setFormData((prev) => ({ ...prev, icon: "" }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      icons: [...(prev.icons || []), val],
      icon: "",
    }));
  };

  const handleRemoveIcon = (idx) => {
    setFormData((prev) => ({
      ...prev,
      icons: (prev.icons || []).filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveExistingImage = (idx) => {
    setFormData((prev) => {
      const currentImages = (prev.images || "")
        .split(",")
        .map((img) => img.trim())
        .filter(Boolean);
      const updatedImages = currentImages.filter((_, i) => i !== idx).join(",");
      return { ...prev, images: updatedImages };
    });
  };

  const handleIconFilesChange = (e) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f && f.type && f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    setIconFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveIconFile = (idx) => {
    setIconFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImageFilesChange = (e) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f && f.type && f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    setImageFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveImageFile = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    // Prepare data to save based on active tab
    let dataToSave = {};

    try {
      if (activeTab === "categories") {
        dataToSave = {
          name: formData.name,
          description: formData.description,
          status: formData.status === "Active" ? "1" : "0",
          slug: formData.slug || formData.name.toLowerCase().replace(/ /g, "_"),
          icon: formData.icon || "",
          subscription_ids: Array.isArray(formData.subscription_ids)
            ? formData.subscription_ids
            : [],
        };

        if (isEditMode) {
          await updateCategory({ id: currentEditId, ...dataToSave }).unwrap();
          toast.success("Category updated successfully");
        } else {
          await createCategory(dataToSave).unwrap();
          toast.success("Category created successfully");
        }
      } else if (activeTab === "services") {
        const iconsText = (formData.icons || []).join(",");
        if (iconFiles.length > 0 || imageFiles.length > 0) {
          const fd = new FormData();
          fd.append("name", formData.name || "");
          fd.append("category_id", formData.category_id || "");
          fd.append("price", formData.price || "");
          fd.append("festival_price", formData.festival_price || "");
          fd.append("member_price", formData.member_price || "");
          fd.append("duration_minutes", formData.duration_minutes || "");
          const fdSubIds = Array.isArray(formData.subscription_ids)
            ? formData.subscription_ids
            : [];
          // Legacy singular field for backward compatibility.
          fd.append("subscription_id", fdSubIds[0] ?? "0");
          fdSubIds.forEach((sid) => fd.append("subscription_ids[]", sid));
          const fdCityIds = Array.isArray(formData.city_ids)
            ? formData.city_ids
            : [];
          fdCityIds.forEach((cid) => fd.append("city_ids[]", cid));
          fd.append("description", formData.description || "");
          fd.append("service_group", formData.service_group || "");
          fd.append("size_type", formData.size_type || "");
          fd.append("size_value", formData.size_value || "");
          fd.append("status", formData.status === "Active" ? "1" : "0");
          fd.append("icon", iconsText);
          fd.append("images", formData.images || "");

          iconFiles.forEach((file) => fd.append("icons[]", file));
          imageFiles.forEach((file) => fd.append("images[]", file));

          const config = { headers: { "Content-Type": "multipart/form-data" } };
          if (isEditMode) {
            await apiClient.post(
              `/api/services/${currentEditId}?_method=PUT`,
              fd,
              config,
            );
            toast.success("Service updated successfully");
          } else {
            await apiClient.post("/api/services", fd, config);
            toast.success("Service created successfully");
          }
          if (typeof refetchServices === "function") {
            await refetchServices();
          }
          if (
            selectedCategoryId &&
            typeof refetchServicesByCategory === "function"
          ) {
            await refetchServicesByCategory();
          }
        } else {
          dataToSave = {
            name: formData.name,
            category_id: formData.category_id,
            // type: formData.type, // Optional if backend infers it or if subscription_id handles it
            price: formData.price,
            festival_price: formData.festival_price,
            member_price: formData.member_price,
            duration_minutes: formData.duration_minutes,
            // Legacy singular field for backward compatibility.
            subscription_id: Array.isArray(formData.subscription_ids)
              ? (formData.subscription_ids[0] ?? "0")
              : "0",
            subscription_ids: Array.isArray(formData.subscription_ids)
              ? formData.subscription_ids
              : [],
            city_ids: Array.isArray(formData.city_ids) ? formData.city_ids : [],
            description: formData.description,
            service_group: formData.service_group || null,
            size_type: formData.size_type || null,
            size_value: formData.size_value || null,
            status: formData.status === "Active" ? "1" : "0",
            icon: iconsText,
            images: formData.images || null,
          };

          if (isEditMode) {
            await updateService({ id: currentEditId, ...dataToSave }).unwrap();
            toast.success("Service updated successfully");
          } else {
            await createService(dataToSave).unwrap();
            toast.success("Service created successfully");
          }
          if (typeof refetchServices === "function") {
            await refetchServices();
          }
          if (
            selectedCategoryId &&
            typeof refetchServicesByCategory === "function"
          ) {
            await refetchServicesByCategory();
          }
        }
      } else if (activeTab === "subscription-types") {
        // Strict payload for Subscription Types
        dataToSave = {
          name: formData.name,
        };

        if (isEditMode) {
          await updateSubscriptionType({
            id: currentEditId,
            name: formData.name,
          }).unwrap();
          toast.success("Subscription Type updated successfully");
        } else {
          await createSubscriptionType(dataToSave).unwrap();
          toast.success("Subscription Type created successfully");
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      // RTK Query unwrap() errors expose `error.data`; axios errors expose
      // `error.response.data`. Surface the backend message/validation errors.
      const payload = error?.data || error?.response?.data;
      const validationMsg =
        payload?.errors && typeof payload.errors === "object"
          ? Object.values(payload.errors).flat().join(" ")
          : null;
      const message =
        validationMsg ||
        payload?.message ||
        error?.message ||
        `Failed to save ${activeTab.slice(0, -1)}`;
      toast.error(message);
      console.error("Save failed:", payload || error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setCurrentEditId(null);
  };

  const getModalTitle = () => {
    const action = isEditMode ? "Edit" : "Add New";
    switch (activeTab) {
      case "categories":
        return `${action} Category`;
      case "services":
        return `${action} Service`;
      case "subscription-types":
        return `${action} Subscription Type`;
      case "add-ons":
        return `${action} Add-on`;
      default:
        return `${action} Item`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {selectedCategoryId && activeTab === "services" && (
              <button
                onClick={handleBackToCategories}
                className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to categories"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Service Management
              </h1>
              {selectedCategoryId && activeTab === "services" && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Services in category:{" "}
                  {categories.find((c) => c.id === selectedCategoryId)?.name}
                </p>
              )}
              {!selectedCategoryId && (
                <p className="text-sm text-gray-500 mt-1">
                  Manage categories, services, and required skills
                </p>
              )}
            </div>
          </div>
        </div>
        {activeTab !== "service-plans" && (
          <button
            onClick={activeTab === "add-ons" ? handleAddAddOn : handleAddClick}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span className="font-medium">
              Add{" "}
              {activeTab === "categories"
                ? "Category"
                : activeTab === "services"
                  ? "Service"
                  : activeTab === "subscription-types"
                    ? "Subscription Type"
                    : "Add-on"}
            </span>
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="flex gap-2">
          <TabButton id="categories" label="Categories" icon={Grid} />
          <TabButton id="services" label="Services" icon={Layers} />
          <TabButton
            id="subscription-types"
            label="Subscription Types"
            icon={Award}
          />
          <TabButton id="add-ons" label="Add-ons" icon={Package} />
          <TabButton
            id="service-plans"
            label="Service Plans"
            icon={CalendarDays}
          />
        </div>

        {activeTab !== "service-plans" && (
          <div className="flex gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            {activeTab === "services" && (
              <CityFilter
                value={serviceCityFilter}
                onChange={setServiceCityFilter}
              />
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {activeTab === "categories" &&
          (categoriesLoading ? (
            <TableSkeleton columns={4} rows={5} />
          ) : (
            <CategoriesTable
              data={filterData(categories)}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onViewServices={handleCategoryClick}
            />
          ))}

        {activeTab === "services" &&
          (servicesLoadingState ? (
            <TableSkeleton columns={5} rows={5} />
          ) : (
            <ServicesTable
              data={filterData(displayServices)}
              categories={categories}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}

        {activeTab === "subscription-types" &&
          (subscriptionTypesLoading ? (
            <TableSkeleton columns={4} rows={5} />
          ) : (
            <SubscriptionTypesTable
              data={filterData(subscriptionTypes)}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}

        {activeTab === "add-ons" &&
          (addOnsLoading ? (
            <TableSkeleton columns={4} rows={5} />
          ) : (
            <AddOnsTable
              addOns={filterData(addOns)}
              isLoading={addOnsLoading}
              onEdit={handleEditAddOn}
              onDelete={handleDeleteClick}
              onAdd={handleAddAddOn}
            />
          ))}

        {activeTab === "service-plans" && (
          <ServicePlansTable services={services} categories={categories} />
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={getModalTitle()}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {isEditMode
              ? `Edit details for ${activeTab.slice(0, -1)}.`
              : `Fill in the details to add a new ${activeTab.slice(0, -1)}.`}
          </p>

          <div className="grid gap-4">
            {/* Name Field - Common for all */}
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
                placeholder={`Enter ${activeTab.slice(0, -1)} name`}
              />
            </div>

            {activeTab === "categories" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="enter_slug_here"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon (Emoji or URL)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      name="icon"
                      value={formData.icon}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Enter icon emoji or image path"
                    />
                    {formData.icon && (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl overflow-hidden border border-gray-200">
                        {typeof formData.icon === "string" &&
                        (formData.icon.startsWith("storage/") ||
                          formData.icon.startsWith("/storage/") ||
                          formData.icon.startsWith("http")) ? (
                          <img
                            src={getImageUrl(formData.icon)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          formData.icon
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Types
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select the subscription types available for this category.
                  </p>
                  <CheckboxGroup
                    items={subscriptionTypes}
                    selectedIds={formData.subscription_ids}
                    onToggle={handleSubscriptionToggle}
                    isLoading={subscriptionTypesLoading}
                    loadingText="Loading subscription types..."
                    emptyText="No subscription types available."
                  />
                </div>
              </>
            )}

            {/* Category Dropdown - For Services */}
            {activeTab === "services" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                >
                  <option value="">Select Category</option>
                  {categories
                    .filter((cat) => Number(cat.status) === 1)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Category Dropdown - For Skills (Removed) */}
            {/* Service Dropdown - Only for Skills (Removed) */}

            {/* Type Field - For Services */}
            {/* {activeTab === "services" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                >
                  <option value="">Select Type</option>
                  <option value="Monthly Subscription">
                    Monthly Subscription
                  </option>
                  <option value="Instant Help">Instant Help</option>
                  <option value="One-Time">One-Time</option>
                  <option value="Daily 8 hours">Daily 8 hours</option>
                </select>
              </div>
            )} */}

            {/* Level Field - For Skills (Removed) */}

            {/* Price Field - Only for Services */}
            {activeTab === "services" && (
              <>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icons
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="icon"
                      value={formData.icon}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Enter icon name or emoji"
                    />
                    <button
                      type="button"
                      onClick={handleAddIcon}
                      className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                  {Array.isArray(formData.icons) &&
                    formData.icons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.icons.map((ic, idx) => (
                          <span
                            key={`${ic}-${idx}`}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            {ic}
                            <button
                              type="button"
                              onClick={() => handleRemoveIcon(idx)}
                              className="text-gray-500 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon Files
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleIconFilesChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                  />
                  {/* Existing Icons Preview */}
                  {isEditMode &&
                    Array.isArray(formData.icons) &&
                    formData.icons.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">
                          Current Icons:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {formData.icons.map((ic, idx) => (
                            <div
                              key={`${ic}-${idx}`}
                              className="relative group w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl overflow-hidden border border-gray-200"
                            >
                              {typeof ic === "string" &&
                              (ic.startsWith("storage/") ||
                                ic.startsWith("/storage/") ||
                                ic.startsWith("http")) ? (
                                <img
                                  src={getImageUrl(ic)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                ic
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveIcon(idx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {iconFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {iconFiles.map((file, idx) => (
                        <span
                          key={`${file.name}-${idx}`}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          {file.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveIconFile(idx)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Images
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                  />
                  {/* Existing Images Preview */}
                  {isEditMode && formData.images && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">
                        Current Image:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {typeof formData.images === "string" &&
                          formData.images
                            .split(",")
                            .map((img) => img.trim())
                            .filter(Boolean)
                            .map((img, idx) => (
                              <div
                                key={`${img}-${idx}`}
                                className="relative group w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-200"
                              >
                                <img
                                  src={getImageUrl(img)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingImage(idx)}
                                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                      </div>
                    </div>
                  )}
                  {imageFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {imageFiles.map((file, idx) => (
                        <span
                          key={`${file.name}-${idx}`}
                          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          {file.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveImageFile(idx)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Festival Price
                  </label>
                  <input
                    type="number"
                    name="festival_price"
                    value={formData.festival_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member Price
                  </label>
                  <input
                    type="number"
                    name="member_price"
                    value={formData.member_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="e.g. 60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Type
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select the subscription types available for this service.
                  </p>
                  <CheckboxGroup
                    items={subscriptionTypes}
                    selectedIds={formData.subscription_ids}
                    onToggle={handleSubscriptionToggle}
                    isLoading={subscriptionTypesLoading}
                    loadingText="Loading subscription types..."
                    emptyText="No subscription types available."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cities
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select the cities where this service is available.
                  </p>
                  <CheckboxGroup
                    items={cities}
                    selectedIds={formData.city_ids}
                    onToggle={handleCityToggle}
                    isLoading={citiesLoading}
                    loadingText="Loading cities..."
                    emptyText="No cities available."
                  />
                </div>
              </>
            )}

            {activeTab === "services" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Group
                  </label>
                  <input
                    type="text"
                    name="service_group"
                    value={formData.service_group}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Enter service group"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size Type
                  </label>
                  <input
                    type="text"
                    name="size_type"
                    value={formData.size_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="e.g. BHK, SQFT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size Value
                  </label>
                  <input
                    type="text"
                    name="size_value"
                    value={formData.size_value}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="e.g. 1, 2, 3"
                  />
                </div>
              </>
            )}

            {/* Status Dropdown - Common for all except Subscription Types */}
            {activeTab !== "subscription-types" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

            {/* Description Field - Common for all except Subscription Types */}
            {activeTab !== "subscription-types" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  rows="3"
                  placeholder="Enter description"
                ></textarea>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              {isEditMode ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add-on Modal */}
      <AddEditAddOnModal
        isOpen={isAddOnModalOpen}
        onClose={() => setIsAddOnModalOpen(false)}
        addOn={currentAddOn}
        onSave={handleSaveAddOn}
        isLoading={createAddOn.isLoading || updateAddOn.isLoading}
      />
    </div>
  );
};

export default ServiceCategories;
