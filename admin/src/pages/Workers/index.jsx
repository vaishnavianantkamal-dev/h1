import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { Plus, Share2, Copy, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import StatsGrid from "../../components/StatsGrid";
import FilterBar from "../../components/FilterBar";
import CityFilter from "../../components/CityFilter";
import WorkersTable from "./components/WorkersTable";
import TableSkeleton from "../../components/TableSkeleton";
import AddEditWorkerModal from "./components/AddEditWorkerModal";
import WorkerDetailsModal from "./components/WorkerDetailsModal";
import WorkerBookingsModal from "./components/WorkerBookingsModal";
import WithdrawalRequestModal from "./components/WithdrawalRequestModal";
import Modal from "../../components/Modal";
import { getImageUrl } from "../../utils/imageUrl";
import {
  useGetServiceCategoriesQuery,
  useGetServicesQuery,
  useGetWorkersPaginatedQuery,
  useGetWorkerMeQuery,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
  useDeleteWorkerMutation,
  useGetCitiesQuery,
  useGetZonesQuery,
  useGetServiceableAreasQuery,
  useRegisterWorkerMutation,
  useUploadWorkerKycMutation,
  useUploadWorkerDocsMutation,
  useInitializeWorkerKycMutation,
  useLazyGetWorkerKycStatusQuery,
  useGetReferralLinkQuery,
  useGetAvgRatingsQuery,
  useUpdateWorkerBankByIdMutation,
  useGetWorkerBankDetailsByIdQuery,
  useGetReferrersDropdownQuery,
} from "../../api/apiSlice";
import { ROLES } from "../../constants/roles";

const Workers = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentWorkerId, setCurrentWorkerId] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewWorker, setViewWorker] = useState(null);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [bookingWorkerId, setBookingWorkerId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawWorker, setWithdrawWorker] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [digilockerKycData, setDigilockerKycData] = useState(null);

  // Determine if current user is a Worker
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = typeof user.role === "object" ? user.role.name : user.role;
  const isWorker = userRole === ROLES.WORKER;

  const { data: referralLinkData } = useGetReferralLinkQuery(undefined, {
    skip: !isWorker,
  });

  const { data: avgRatingsData } = useGetAvgRatingsQuery(undefined, {
    skip: isWorker,
  });

  const avgRatings = useMemo(
    () => avgRatingsData?.data || [],
    [avgRatingsData],
  );

  const { data: apiCategories = [] } = useGetServiceCategoriesQuery();
  const { data: apiServices = [] } = useGetServicesQuery();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategoryId, cityId]);

  const {
    data: workersResponse,
    isLoading: isLoadingAll,
    refetch: refetchWorkers,
  } = useGetWorkersPaginatedQuery(
    {
      page: currentPage,
      search: debouncedSearchTerm,
      category_id: selectedCategoryId,
      city_id: cityId,
    },
    {
      skip: isWorker,
    },
  );

  const allWorkers = useMemo(
    () => workersResponse?.data || [],
    [workersResponse],
  );

  const totalWorkersCount = workersResponse?.total || 0;
  const lastPage = workersResponse?.last_page || 1;
  const fromItem = workersResponse?.from || 0;
  const toItem = workersResponse?.to || 0;
  const apiStats = workersResponse?.stats || null;

  const {
    data: myWorkerData,
    isLoading: isLoadingMe,
    refetch: refetchMyWorker,
  } = useGetWorkerMeQuery(undefined, {
    skip: !isWorker,
  });

  // Handle navigation from other pages (e.g. ContractorWorkers)
  useEffect(() => {
    if (location.state?.search) {
      setSearchTerm(location.state.search);
    }
  }, [location.state]);

  const workersData = useMemo(() => {
    let baseWorkers = [];
    if (isWorker) {
      baseWorkers = myWorkerData ? [myWorkerData] : [];
    } else {
      baseWorkers = allWorkers;
    }

    // Merge average ratings
    return baseWorkers.map((worker) => {
      const ratingInfo = avgRatings.find((r) => r.worker_id === worker.id);
      return {
        ...worker,
        rating: ratingInfo ? ratingInfo.average_rating : worker.rating || "N/A",
        reviews: ratingInfo ? ratingInfo.total_ratings : worker.reviews || 0,
      };
    });
  }, [isWorker, myWorkerData, allWorkers, avgRatings]);

  const isLoading = isWorker ? isLoadingMe : isLoadingAll;

  const { data: cities = [] } = useGetCitiesQuery();
  const { data: zones = [] } = useGetZonesQuery();
  const { data: serviceableAreas = [] } = useGetServiceableAreasQuery();
  const { data: referrers = [] } = useGetReferrersDropdownQuery();

  const [createWorker] = useCreateWorkerMutation();
  const [updateWorker] = useUpdateWorkerMutation();
  const [deleteWorker] = useDeleteWorkerMutation();
  const [registerWorker] = useRegisterWorkerMutation();
  const [uploadWorkerKyc] = useUploadWorkerKycMutation();
  const [uploadWorkerDocs] = useUploadWorkerDocsMutation();
  const [initializeWorkerKyc, { isLoading: isInitializingDigiLockerKyc }] =
    useInitializeWorkerKycMutation();
  const [triggerWorkerKycStatus, { isFetching: isCheckingDigiLockerStatus }] =
    useLazyGetWorkerKycStatusQuery();
  const [updateWorkerBankById] = useUpdateWorkerBankByIdMutation();

  const { data: workerBankDetails, isError: isWorkerBankError } =
    useGetWorkerBankDetailsByIdQuery(isEditMode ? currentWorkerId : undefined, {
      skip: !isEditMode || !currentWorkerId || !isModalOpen,
    });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    photo: null,
    emergency_contact: "",
    current_address: "",
    permanent_address: "",
    categories: [],
    services: [],

    status: "Active",
    city_id: "",
    zone_id: "",
    serviceable_area_id: "",
    skills: "",
    walletBalance: "",
    aadhaarNo: "",
    policeId: "",
    account_holder_name: "",
    account_no: "",
    bank_name: "",
    ifsc_code: "",
    aadhaarFrontImage: null,
    aadhaarBackImage: null,
    policeFrontImage: null,
    policeBackImage: null,
    kycStatus: "Pending",
    availableDates: [],
    availableTimes: [],
    password: "",
    date_of_joining: "",
    monthly_salary: "",
  });

  useEffect(() => {
    if (!isEditMode || !isModalOpen || !currentWorkerId) return;

    if (isWorkerBankError || !workerBankDetails) {
      setFormData((prev) => ({
        ...prev,
        account_holder_name: "",
        account_no: "",
        bank_name: "",
        ifsc_code: "",
      }));
      return;
    }

    // If API returns { status: false, message: "Worker profile not found" }
    if (
      workerBankDetails.status === false &&
      !workerBankDetails.account_no &&
      !workerBankDetails.bank_name &&
      !workerBankDetails.ifsc_code
    ) {
      setFormData((prev) => ({
        ...prev,
        account_holder_name: "",
        account_no: "",
        bank_name: "",
        ifsc_code: "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      account_holder_name: workerBankDetails.account_holder_name || "",
      account_no: workerBankDetails.account_no || "",
      bank_name: workerBankDetails.bank_name || "",
      ifsc_code: workerBankDetails.ifsc_code || "",
    }));
  }, [
    isEditMode,
    isModalOpen,
    currentWorkerId,
    workerBankDetails,
    isWorkerBankError,
  ]);

  const categories = useMemo(
    () => [
      { id: "", name: "All", icon: null },
      ...apiCategories
        .filter((c) => Number(c.status) === 1)
        .map((c) => ({
          id: String(c.id),
          name: c.name,
          icon: c.icon,
        })),
    ],
    [apiCategories],
  );

  // Search + category filtering happens server-side via /api/admin/workers?search=...&category_id=...
  const filteredWorkers = workersData;

  // Helper to generate unique display name for services
  const getServiceDisplayName = (service, allServices) => {
    if (!service) return "";
    const count = allServices.filter((s) => s.name === service.name).length;
    if (count > 1 && service.description) {
      return `${service.name} (${service.description})`;
    }
    return service.name;
  };

  // Derived options for MultiSelect (only active: status === 1)
  const categoryOptions = useMemo(
    () => apiCategories.filter((c) => Number(c.status) === 1).map((c) => c.name),
    [apiCategories],
  );

  // Filter services based on selected categories; only show active services (status === 1)
  const serviceOptions = useMemo(() => {
    let relevantServices = apiServices.filter((s) => Number(s.status) === 1);

    if (formData.categories.length > 0) {
      relevantServices = relevantServices.filter((s) => {
        // Resolve category name from service object
        let serviceCategoryName = "";
        if (typeof s.category === "object" && s.category !== null) {
          serviceCategoryName = s.category.name;
        } else if (typeof s.category === "string") {
          serviceCategoryName = s.category;
        } else if (s.category_id) {
          // Fallback: Find category name by ID
          const cat = apiCategories.find(
            (c) => String(c.id) === String(s.category_id),
          );
          serviceCategoryName = cat ? cat.name : "";
        }
        return formData.categories.includes(serviceCategoryName);
      });
    }

    return relevantServices.map((s) => getServiceDisplayName(s, apiServices));
  }, [formData.categories, apiServices, apiCategories]);

  const filteredZones = useMemo(() => {
    return zones.filter((z) => String(z.city_id) === String(formData.city_id));
  }, [zones, formData.city_id]);

  const filteredServiceableAreas = useMemo(() => {
    return serviceableAreas.filter(
      (sa) => String(sa.zone_id) === String(formData.zone_id),
    );
  }, [serviceableAreas, formData.zone_id]);

  const handleAddClick = () => {
    setIsEditMode(false);
    setCurrentWorkerId(null);

    const today = new Date();
    const nextYearDates = eachDayOfInterval({
      start: today,
      end: addDays(today, 365),
    }).map((date) => format(date, "yyyy-MM-dd"));

    setFormData({
      name: "",
      email: "",
      phone: "",
      photo: null,
      emergency_contact: "",
      current_address: "",
      permanent_address: "",
      refer_by: "",
      categories: [],
      services: [],

      status: "Unavailable",
      city_id: "",
      zone_id: "",
      serviceable_area_id: "",
      skills: "",
      walletBalance: "",
      aadhaarNo: "",
      policeId: "",
      account_holder_name: "",
      account_no: "",
      bank_name: "",
      ifsc_code: "",
      aadhaarFrontImage: null,
      aadhaarBackImage: null,
      policeFrontImage: null,
      policeBackImage: null,
      kycStatus: "Pending",
      availableDates: nextYearDates,
      availableTimes: [],
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (worker) => {
    setIsEditMode(true);
    setCurrentWorkerId(worker.id);

    // Helper to normalize array of strings/objects/ids to array of names/display names
    const normalizeToDisplayNames = (
      items,
      sourceList = [],
      isService = false,
    ) => {
      if (!items) return [];
      const array = Array.isArray(items) ? items : [items];
      return array
        .map((item) => {
          // For categories, we just need names as they are likely unique or simple strings
          if (!isService) {
            if (typeof item === "object" && item !== null) return item.name;
            if (
              sourceList.length > 0 &&
              (typeof item === "number" ||
                (typeof item === "string" && /^\d+$/.test(item)))
            ) {
              const found = sourceList.find(
                (s) => String(s.id) === String(item),
              );
              if (found) return found.name;
            }
            return item;
          }

          // For Services, we need to resolve to Display Name
          let foundService = null;
          if (typeof item === "object" && item !== null && item.id) {
            foundService = sourceList.find(
              (s) => String(s.id) === String(item.id),
            );
          } else if (typeof item === "object" && item !== null && item.name) {
            foundService = sourceList.find((s) => s.name === item.name);
          } else if (
            sourceList.length > 0 &&
            (typeof item === "number" ||
              (typeof item === "string" && /^\d+$/.test(item)))
          ) {
            foundService = sourceList.find(
              (s) => String(s.id) === String(item),
            );
          } else if (typeof item === "string") {
            foundService = sourceList.find((s) => s.name === item);
          }

          if (foundService) {
            return getServiceDisplayName(foundService, sourceList);
          }

          if (typeof item === "object" && item !== null) return item.name;
          return item;
        })
        .filter(Boolean);
    };

    const rawCategories = worker.category || worker.categories || [];
    const currentCategories = normalizeToDisplayNames(
      rawCategories,
      apiCategories,
      false,
    );

    const rawServices = worker.services || worker.service || [];
    const currentServices = normalizeToDisplayNames(
      rawServices,
      apiServices,
      true,
    );

    // Extract availability
    const availability =
      worker.worker_availablillity || worker.availability || [];
    const extractedDates = new Set();
    const extractedTimes = new Set(); // store as stringified JSON to dedup

    if (Array.isArray(availability)) {
      availability.forEach((slot) => {
        if (Array.isArray(slot.available_dates)) {
          slot.available_dates.forEach((d) => extractedDates.add(d));
        }
        if (Array.isArray(slot.available_times)) {
          slot.available_times.forEach((t) =>
            extractedTimes.add(JSON.stringify(t)),
          );
        }
      });
    }

    // Extract documents from new API structure for edit
    const aadharDoc = Array.isArray(worker.documents)
      ? worker.documents.find((d) => d.type === "aadhar")
      : null;
    const policeDoc = Array.isArray(worker.documents)
      ? worker.documents.find((d) => d.type === "police_verification")
      : null;

    const BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "https://hobitadmin.hobit.club";

    const getFullUrl = (path) => {
      if (!path) return null;
      if (typeof path !== "string") return null;
      if (path.startsWith("http") || path.startsWith("blob:"))
        return path.trim();
      return `${BASE_URL}/${path.replace(/^\/+/, "")}`;
    };

    setFormData({
      name: worker.name || "",
      email: worker.email || "",
      phone: worker.phone || "",
      photo: worker.photo || worker.profile_image || worker.avatar || "",
      emergency_contact: worker.emergency_contact || "",
      current_address: worker.current_address || "",
      permanent_address: worker.permanent_address || "",
      refer_by:
        typeof worker.refer_by === "object"
          ? String(worker.refer_by?.id || "")
          : String(worker.refer_by || ""),
      categories: currentCategories,
      services: currentServices,

      status:
        worker.is_active === 1 || worker.is_active === "1"
          ? "Available"
          : worker.is_active === 0 || worker.is_active === "0"
            ? "Unavailable"
            : worker.status || "Available",
      city_id: String(worker.city_id || worker.city?.id || ""),
      zone_id: String(worker.zone_id || worker.zone?.id || ""),
      serviceable_area_id: String(
        worker.serviceable_area_id ||
          worker.serviceable_area?.id ||
          worker.area_id ||
          worker.area?.id ||
          "",
      ),
      skills: Array.isArray(worker.skills)
        ? worker.skills.join(", ")
        : worker.skills || "",
      walletBalance:
        worker.walletBalance !== undefined && worker.walletBalance !== null
          ? worker.walletBalance
          : "",
      aadhaarNo:
        aadharDoc?.number ||
        (Array.isArray(worker.worker?.id_number)
          ? worker.worker.id_number[0]
          : worker.worker?.id_number) ||
        worker.aadhaarNo ||
        "",
      policeId:
        policeDoc?.number ||
        (Array.isArray(worker.worker?.id_number)
          ? worker.worker.id_number[1]
          : null) ||
        worker.policeId ||
        "",
      account_holder_name:
        worker.account_holder_name ||
        worker.bank_details?.account_holder_name ||
        "",
      account_no: worker.account_no || worker.bank_details?.account_no || "",
      bank_name: worker.bank_name || worker.bank_details?.bank_name || "",
      ifsc_code: worker.ifsc_code || worker.bank_details?.ifsc_code || "",

      aadhaarFrontImage: aadharDoc?.front_url
        ? aadharDoc.front_url.trim()
        : getFullUrl(
            worker.aadhaarFrontImage ||
              (Array.isArray(worker.worker?.id_front_path)
                ? worker.worker.id_front_path[0]
                : worker.worker?.id_front_path),
          ),
      aadhaarBackImage: aadharDoc?.back_url
        ? aadharDoc.back_url.trim()
        : getFullUrl(
            worker.aadhaarBackImage ||
              (Array.isArray(worker.worker?.id_back_path)
                ? worker.worker.id_back_path[0]
                : worker.worker?.id_back_path),
          ),
      policeFrontImage: policeDoc?.front_url
        ? policeDoc.front_url.trim()
        : getFullUrl(
            worker.policeFrontImage ||
              (Array.isArray(worker.worker?.id_front_path)
                ? worker.worker.id_front_path[1]
                : null) || // Fallback if no specific police path
              worker.policeImage,
          ),
      policeBackImage: policeDoc?.back_url
        ? policeDoc.back_url.trim()
        : getFullUrl(
            worker.policeBackImage ||
              (Array.isArray(worker.worker?.id_back_path)
                ? worker.worker.id_back_path[1]
                : null),
          ),

      kycStatus:
        worker.kyc_status ||
        worker.worker?.kyc_status ||
        worker.kycStatus ||
        "Pending",
      availableDates: Array.from(extractedDates),
      availableTimes: Array.from(extractedTimes).map((t) => JSON.parse(t)),
      password: worker.password || "",
      date_of_joining: worker.date_of_joining || "",
      monthly_salary: worker.monthly_salary || "",
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setCurrentWorkerId(null);
  };

  const handleViewClick = (worker) => {
    setDigilockerKycData(null);

    // Extract documents from new API structure
    const aadharDoc = Array.isArray(worker.documents)
      ? worker.documents.find((d) => d.type === "aadhar")
      : null;
    const policeDoc = Array.isArray(worker.documents)
      ? worker.documents.find((d) => d.type === "police_verification")
      : null;

    const normalizedWorker = {
      ...worker,
      refer_by: worker.refer_by || "N/A",
      photo: worker.photo || worker.profile_image || worker.avatar || null,
      avatar: getImageUrl(worker.avatar || worker.profile_image),
      current_address: worker.current_address || "N/A",
      permanent_address: worker.permanent_address || "N/A",
      aadhaarNo:
        aadharDoc?.number ||
        (Array.isArray(worker.worker?.id_number)
          ? worker.worker.id_number[0]
          : worker.worker?.id_number) ||
        worker.aadhaarNo ||
        "N/A",
      policeId:
        policeDoc?.number ||
        (Array.isArray(worker.worker?.id_number)
          ? worker.worker.id_number[1]
          : null) ||
        worker.policeId ||
        "N/A",

      // Map images supporting both legacy nested paths and flat paths
      aadhaarFrontImage: aadharDoc?.front_url
        ? aadharDoc.front_url.trim()
        : getImageUrl(
            worker.aadhaarFrontImage ||
              (Array.isArray(worker.worker?.id_front_path)
                ? worker.worker.id_front_path[0]
                : worker.worker?.id_front_path) ||
              worker.aadhaarImage,
          ),
      aadhaarBackImage: aadharDoc?.back_url
        ? aadharDoc.back_url.trim()
        : getImageUrl(
            worker.aadhaarBackImage ||
              (Array.isArray(worker.worker?.id_back_path)
                ? worker.worker.id_back_path[0]
                : worker.worker?.id_back_path),
          ),

      policeFrontImage: policeDoc?.front_url
        ? policeDoc.front_url.trim()
        : getImageUrl(
            worker.policeFrontImage ||
              (Array.isArray(worker.worker?.id_front_path)
                ? worker.worker.id_front_path[1]
                : null) || // Fallback if no specific police path
              worker.policeImage,
          ),
      policeBackImage: policeDoc?.back_url
        ? policeDoc.back_url.trim()
        : getImageUrl(
            worker.policeBackImage ||
              (Array.isArray(worker.worker?.id_back_path)
                ? worker.worker.id_back_path[1]
                : null),
          ),

      kycStatus:
        worker.kyc_status ||
        worker.worker?.kyc_status ||
        worker.kycStatus ||
        "Pending",

      // Normalize services: if 'services' array exists use it, else if 'service' object exists wrap it
      services: worker.services
        ? worker.services
        : worker.service
          ? [worker.service]
          : [],

      // Normalize availability
      availability: worker.worker_availablillity || worker.availability || [],
    };

    setViewWorker(normalizedWorker);
    setIsViewModalOpen(true);
  };

  const handleViewClose = () => {
    setIsViewModalOpen(false);
    setViewWorker(null);
    setDigilockerKycData(null);
  };

  const handleViewBookings = (worker) => {
    setBookingWorkerId(worker.id);
    setIsBookingsModalOpen(true);
  };

  const handleWithdrawClick = (worker) => {
    setWithdrawWorker(worker);
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawClose = () => {
    setIsWithdrawModalOpen(false);
    setWithdrawWorker(null);
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTargetWorkerId = () => {
    if (!viewWorker) return null;
    return viewWorker.id || viewWorker.worker_id || viewWorker.worker?.id;
  };

  const handleInitializeDigiLockerKyc = async () => {
    const targetId = getTargetWorkerId();
    if (!targetId) {
      toast.error("Unable to start DigiLocker session");
      return;
    }

    try {
      const response = await initializeWorkerKyc({
        worker_id: targetId,
      }).unwrap();
      const digilockerUrl = response?.data?.digilocker_url;
      setDigilockerKycData(response?.data || null);

      if (digilockerUrl) {
        window.open(digilockerUrl, "_blank", "noopener,noreferrer");
      }

      toast.success(
        response?.message ||
          "DigiLocker session created. Complete KYC and check status.",
      );
    } catch (error) {
      console.error("Failed to initialize DigiLocker KYC:", error);
      toast.error(
        error?.data?.message || "Failed to initialize DigiLocker KYC",
      );
    }
  };

  const handleCheckDigiLockerStatus = async ({ showToast = true } = {}) => {
    const targetId = getTargetWorkerId();
    if (!targetId) {
      toast.error("Unable to check DigiLocker status");
      return;
    }

    try {
      const response = await triggerWorkerKycStatus(targetId).unwrap();
      const statusData = response?.data || {};
      const statusValue = (statusData.status || "").toLowerCase();
      const mappedKycStatus =
        statusValue === "completed" || statusValue === "verified"
          ? "Verified"
          : statusValue === "rejected" || statusValue === "failed"
            ? "Rejected"
            : "Pending";

      setDigilockerKycData((prev) => ({
        ...(prev || {}),
        ...statusData,
      }));

      setViewWorker((prev) =>
        prev
          ? {
              ...prev,
              kycStatus: mappedKycStatus,
              aadhaarNo: statusData.aadhaar || prev.aadhaarNo,
            }
          : prev,
      );

      await Promise.all([
        isWorker ? refetchMyWorker() : Promise.resolve(),
        !isWorker ? refetchWorkers() : Promise.resolve(),
      ]);

      if (mappedKycStatus === "Verified" && showToast) {
        toast.success("Aadhaar KYC verified successfully via DigiLocker");
        return;
      }

      if (mappedKycStatus === "Pending" && showToast) {
        toast("DigiLocker KYC is still in progress.");
        return;
      }

      if (showToast) {
        toast(
          response?.message ||
            `Current DigiLocker status: ${statusData.status}`,
        );
      }
    } catch (error) {
      console.error("Failed to fetch DigiLocker KYC status:", error);
      if (showToast) {
        toast.error(
          error?.data?.message || "Failed to fetch DigiLocker KYC status",
        );
      }
    }
  };

  useEffect(() => {
    if (!isViewModalOpen || !viewWorker) return;
    handleCheckDigiLockerStatus({ showToast: false });
  }, [isViewModalOpen, viewWorker?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (newCategories) => {
    setFormData((prev) => ({ ...prev, categories: newCategories }));
  };

  const handleServiceChange = (newServices) => {
    setFormData((prev) => ({ ...prev, services: newServices }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  };

  const handleDatesChange = (dates) => {
    setFormData((prev) => ({ ...prev, availableDates: dates }));
  };

  const handleTimesChange = (times) => {
    setFormData((prev) => ({ ...prev, availableTimes: times }));
  };

  const handleSave = async () => {
    try {
      const buildMultipartFormData = (payload, fileFields = []) => {
        const multipartData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;

          if (fileFields.includes(key)) {
            if (value instanceof File) multipartData.append(key, value);
            return;
          }

          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (item === undefined || item === null) return;
              if (key === "available_times") {
                multipartData.append(`${key}[]`, JSON.stringify(item));
              } else {
                multipartData.append(`${key}[]`, String(item));
              }
            });
            return;
          }

          multipartData.append(key, String(value));
        });
        return multipartData;
      };

      if (isEditMode) {
        // Map names back to IDs for API
        const categoryIds = apiCategories
          .filter((c) => formData.categories.includes(c.name))
          .map((c) => c.id);

        const selectedServices = apiServices.filter((s) =>
          formData.services.includes(getServiceDisplayName(s, apiServices)),
        );
        const serviceIds = selectedServices.map((s) => s.id);
        const serviceNames = selectedServices.map((s) => s.name);

        const workerData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          emergency_contact: formData.emergency_contact,
          current_address: formData.current_address || null,
          permanent_address: formData.permanent_address || null,
          refer_by: formData.refer_by,
          // Send both names and IDs to cover all bases
          category: formData.categories,
          category_ids: categoryIds,
          services: serviceNames,
          service_ids: serviceIds,
          status: formData.status === "Available" ? "Active" : "Inactive",
          is_active: formData.status === "Available" ? 1 : 0,
          city_id: formData.city_id,
          zone_id: formData.zone_id,
          serviceable_area_id: formData.serviceable_area_id,
          area_id: formData.serviceable_area_id, // Add alias for area_id
          skills: formData.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          walletBalance: Number(formData.walletBalance) || 0,
          aadhaarNo: formData.aadhaarNo,
          policeId: formData.policeId,
          // Images are handled separately via uploadWorkerDocs
          kycStatus: formData.kycStatus,
          available_dates: formData.availableDates,
          available_times: formData.availableTimes,
          date_of_joining: formData.date_of_joining,
          monthly_salary: formData.monthly_salary,
        };

        // Only include password if it's provided (not empty)
        if (formData.password) {
          workerData.password = formData.password;
        }

        const shouldUploadPhoto = formData.photo instanceof File;
        const updatePayload = shouldUploadPhoto
          ? buildMultipartFormData({ ...workerData, photo: formData.photo }, [
              "photo",
            ])
          : workerData;

        await updateWorker({
          id: currentWorkerId,
          data: updatePayload,
        }).unwrap();

        if (
          formData.account_holder_name ||
          formData.account_no ||
          formData.bank_name ||
          formData.ifsc_code
        ) {
          await updateWorkerBankById({
            user_id: currentWorkerId,
            account_holder_name: formData.account_holder_name || "",
            account_no: formData.account_no || "",
            bank_name: formData.bank_name || "",
            ifsc_code: formData.ifsc_code || "",
          }).unwrap();
        }

        // Handle KYC Docs Update
        const kycData = new FormData();
        let hasKycUpdate = false;

        // Find original worker to compare data
        const originalWorker = workersData.find(
          (w) => w.id === currentWorkerId,
        );

        // Aadhaar Check
        const originalAadhaarDoc = originalWorker?.documents?.find(
          (d) => d.type === "aadhar",
        );
        const originalAadhaarNo = originalAadhaarDoc?.number || "";
        const aadhaarNoChanged = formData.aadhaarNo !== originalAadhaarNo;
        const hasNewAadhaarFiles =
          formData.aadhaarFrontImage instanceof File ||
          formData.aadhaarBackImage instanceof File;

        // Police Check
        const originalPoliceDoc = originalWorker?.documents?.find(
          (d) => d.type === "police_verification",
        );
        const originalPoliceId = originalPoliceDoc?.number || "";
        const policeIdChanged = formData.policeId !== originalPoliceId;
        const hasNewPoliceFiles =
          formData.policeFrontImage instanceof File ||
          formData.policeBackImage instanceof File;

        if (aadhaarNoChanged || hasNewAadhaarFiles) {
          kycData.append("id_type[]", "aadhar");
          kycData.append("id_number[]", formData.aadhaarNo);
          // Only append if it's a File, otherwise we might be missing the file if unchanged?
          // If unchanged (string URL), we can't upload it.
          // Assuming API handles partial updates or we only send changed docs.
          if (formData.aadhaarFrontImage instanceof File) {
            kycData.append("id_front[]", formData.aadhaarFrontImage);
          }
          if (formData.aadhaarBackImage instanceof File) {
            kycData.append("id_back[]", formData.aadhaarBackImage);
          }
          hasKycUpdate = true;
        }

        if (policeIdChanged || hasNewPoliceFiles) {
          kycData.append("id_type[]", "police_verification");
          kycData.append("id_number[]", formData.policeId);
          if (formData.policeFrontImage instanceof File) {
            kycData.append("id_front[]", formData.policeFrontImage);
          }
          if (formData.policeBackImage instanceof File) {
            kycData.append("id_back[]", formData.policeBackImage);
          }
          hasKycUpdate = true;
        }

        if (hasKycUpdate) {
          await uploadWorkerDocs({
            id: currentWorkerId,
            kycData,
          }).unwrap();
          toast.success("Worker and KYC documents updated successfully");
        } else {
          toast.success("Worker updated successfully");
        }
      } else {
        // Registration Logic

        // Map Names to IDs
        const categoryIds = apiCategories
          .filter((c) => formData.categories.includes(c.name))
          .map((c) => c.id);

        const serviceIds = apiServices
          .filter((s) =>
            formData.services.includes(getServiceDisplayName(s, apiServices)),
          )
          .map((s) => s.id);

        const registerPayload = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          emergency_contact: formData.emergency_contact,
          current_address: formData.current_address || null,
          permanent_address: formData.permanent_address || null,
          refer_by: formData.refer_by,
          password: formData.password,
          category_ids: categoryIds,
          service_ids: serviceIds,
          city_id: Number(formData.city_id),
          zone_id: Number(formData.zone_id),
          area_id: Number(formData.serviceable_area_id),
          available_dates: formData.availableDates,
          available_times: formData.availableTimes,
          date_of_joining: formData.date_of_joining,
          monthly_salary: formData.monthly_salary,
          status: formData.status === "Available" ? "Active" : "Inactive",
          is_active: formData.status === "Available" ? 1 : 0,
        };
        const shouldUploadPhoto = formData.photo instanceof File;
        const registerBody = shouldUploadPhoto
          ? buildMultipartFormData(
              { ...registerPayload, photo: formData.photo },
              ["photo"],
            )
          : registerPayload;

        const response = await registerWorker(registerBody).unwrap();
        console.log("Register Worker Response:", response);

        // KYC Upload Step
        // Get the new worker ID from the response (check multiple possible locations)
        const newWorkerId =
          response.id ||
          response.data?.id ||
          response.worker?.id ||
          response.data?.worker?.id ||
          response.user?.id ||
          response.data?.user?.id;

        console.log("Extracted Worker ID:", newWorkerId);

        if (newWorkerId) {
          const kycData = new FormData();
          let hasKycData = false;

          // 1. Aadhaar Upload
          if (formData.aadhaarFrontImage) {
            kycData.append("id_type[]", "aadhar");
            kycData.append("id_number[]", formData.aadhaarNo);
            kycData.append("id_front[]", formData.aadhaarFrontImage);
            if (formData.aadhaarBackImage) {
              kycData.append("id_back[]", formData.aadhaarBackImage);
            }
            hasKycData = true;
          }

          // 2. Police Verification Upload
          if (formData.policeFrontImage) {
            kycData.append("id_type[]", "police_verification");
            kycData.append("id_number[]", formData.policeId);
            kycData.append("id_front[]", formData.policeFrontImage);
            if (formData.policeBackImage) {
              kycData.append("id_back[]", formData.policeBackImage);
            }
            hasKycData = true;
          }

          if (hasKycData) {
            // Use uploadWorkerDocs (Admin endpoint) instead of uploadWorkerKyc
            await uploadWorkerDocs({ id: newWorkerId, kycData }).unwrap();
            toast.success("Worker registered and KYC uploaded successfully");
          } else {
            toast.success("Worker registered successfully");
          }
        } else {
          console.warn(
            "Worker ID not found in response, skipping KYC upload",
            response,
          );
          toast.success("Worker registered successfully");
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save worker:", error);
      toast.error(error?.data?.message || "Failed to save worker");
    }
  };

  const handleDeleteClick = (worker) => {
    setWorkerToDelete(worker);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!workerToDelete) return;
    try {
      await deleteWorker(workerToDelete.id).unwrap();
      toast.success("Worker deleted successfully");
      setIsDeleteModalOpen(false);
      setWorkerToDelete(null);
    } catch (error) {
      console.error("Failed to delete worker:", error);
      toast.error("Failed to delete worker");
    }
  };

  const getKycStatus = (w) => {
    const status =
      w.kyc_status || w.worker?.kyc_status || w.kycStatus || "pending";
    return status.toLowerCase();
  };

  const getAvailability = (w) => {
    if (w.is_active === 0 || w.is_active === "0") return "Unavailable";
    if (w.is_active === 1 || w.is_active === "1") return "Available";
    return (
      w.availability ||
      (w.worker_availablillity?.length > 0 ? "Available" : "Unavailable")
    );
  };

  // Prefer API-provided totals (cover the full result set), fall back to
  // client-side counts on the per-worker self-view where apiStats is unavailable
  const statsData = [
    {
      label: "Total Workers",
      value:
        apiStats?.total_workers ??
        (isWorker ? workersData.length : totalWorkersCount),
      colorClass: "text-gray-900",
    },
    {
      label: "Available",
      value:
        apiStats?.available ??
        workersData.filter((w) => getAvailability(w) === "Available").length,
      colorClass: "text-blue-600",
    },
    {
      label: "Unavailable",
      value:
        apiStats?.unavailable ??
        workersData.filter((w) => getAvailability(w) === "Unavailable").length,
      colorClass: "text-gray-500",
    },
    {
      label: "Approved KYC",
      value:
        apiStats?.approved_kyc ??
        workersData.filter((w) => {
          const s = getKycStatus(w);
          return s === "verified" || s === "approved";
        }).length,
      colorClass: "text-green-600",
    },
    {
      label: "Rejected KYC",
      value:
        apiStats?.rejected_kyc ??
        workersData.filter((w) => getKycStatus(w) === "rejected").length,
      colorClass: "text-red-600",
    },
    {
      label: "Pending KYC",
      value:
        apiStats?.pending_kyc ??
        workersData.filter((w) => {
          const s = getKycStatus(w);
          return s !== "verified" && s !== "approved" && s !== "rejected";
        }).length,
      colorClass: "text-yellow-600",
    },
  ];

  const filterTabs = categories.map((cat) => ({
    id: cat.id,
    label: cat.name,
    icon: cat.icon,
  }));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Workers Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage KYC, Skills, Availability & Wallet
          </p>
        </div>
        {!isWorker && (
          <button
            onClick={handleAddClick}
            className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
          >
            <Plus size={20} />
            <span className="font-medium">Add New Worker</span>
          </button>
        )}
        {isWorker && (
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30"
          >
            <Share2 size={20} />
            <span className="font-medium">Share Referral Link</span>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={statsData} />

      {/* Filters & Search */}
      <FilterBar
        tabs={filterTabs}
        activeTab={selectedCategoryId}
        onTabChange={setSelectedCategoryId}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name or phone..."
        onFilterClick={() => {}}
        rightSlot={<CityFilter value={cityId} onChange={setCityId} />}
      />

      {/* Workers Table */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={5} />
      ) : (
        <>
          <WorkersTable
            workers={filteredWorkers}
            onEdit={handleEditClick}
            onView={handleViewClick}
            onViewBookings={handleViewBookings}
            onDelete={handleDeleteClick}
            onWithdraw={handleWithdrawClick}
            currentPage={currentPage}
            totalPages={lastPage}
            onPageChange={setCurrentPage}
            totalItems={totalWorkersCount}
            fromItem={fromItem}
            toItem={toItem}
          />
          {/* Pagination Controls - Removed and moved to WorkersTable */}
        </>
      )}

      <AddEditWorkerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isEditMode={isEditMode}
        formData={formData}
        handleInputChange={handleInputChange}
        handleCategoryChange={handleCategoryChange}
        handleServiceChange={handleServiceChange}
        handleFileChange={handleFileChange}
        handleDatesChange={handleDatesChange}
        handleTimesChange={handleTimesChange}
        handleSave={handleSave}
        categoryOptions={categoryOptions}
        serviceOptions={serviceOptions}
        cities={cities}
        filteredZones={filteredZones}
        filteredServiceableAreas={filteredServiceableAreas}
        referrers={referrers}
      />

      <WorkerDetailsModal
        isOpen={isViewModalOpen}
        onClose={handleViewClose}
        viewWorker={viewWorker}
        apiServices={apiServices}
        onInitializeDigiLockerKyc={handleInitializeDigiLockerKyc}
        onCheckDigiLockerStatus={handleCheckDigiLockerStatus}
        isInitializingDigiLockerKyc={isInitializingDigiLockerKyc}
        isCheckingDigiLockerStatus={isCheckingDigiLockerStatus}
        digilockerKycData={digilockerKycData}
      />

      <WorkerBookingsModal
        isOpen={isBookingsModalOpen}
        onClose={() => setIsBookingsModalOpen(false)}
        workerId={bookingWorkerId}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Worker"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete worker{" "}
            <span className="font-semibold">{workerToDelete?.name}</span>? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Delete Worker
            </button>
          </div>
        </div>
      </Modal>

      <WithdrawalRequestModal
        isOpen={isWithdrawModalOpen}
        onClose={handleWithdrawClose}
        worker={withdrawWorker}
      />

      {/* Share Referral Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Your Referral Link"
        size="md"
      >
        <div className="space-y-6">
          <p className="text-gray-600 text-sm">
            Share these links to invite others to join Hobit. You'll earn
            rewards for every successful referral!
          </p>

          {/* Referral Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Your Referral Code
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="flex-1 font-mono font-semibold text-gray-900 tracking-wider">
                {referralLinkData?.referral_code || "Loading..."}
              </span>
              <button
                onClick={() =>
                  handleCopy(referralLinkData?.referral_code, "code")
                }
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-primary"
                title="Copy Code"
              >
                {copiedField === "code" ? (
                  <Check size={18} className="text-green-500" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>

          {/* User Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Customer Referral Link
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="flex-1 text-sm text-gray-600 truncate">
                {referralLinkData?.referral_link || "Loading..."}
              </span>
              <button
                onClick={() =>
                  handleCopy(referralLinkData?.referral_link, "link")
                }
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-primary"
                title="Copy Link"
              >
                {copiedField === "link" ? (
                  <Check size={18} className="text-green-500" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Use this link to invite new customers.
            </p>
          </div>

          {/* Worker Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Worker Referral Link
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="flex-1 text-sm text-gray-600 truncate">
                {referralLinkData?.worker_referral_link || "Loading..."}
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    referralLinkData?.worker_referral_link,
                    "worker_link",
                  )
                }
                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500 hover:text-primary"
                title="Copy Link"
              >
                {copiedField === "worker_link" ? (
                  <Check size={18} className="text-green-500" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Use this link to invite other workers.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Workers;
