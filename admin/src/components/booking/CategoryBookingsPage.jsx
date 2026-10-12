import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Download, Search, X } from "lucide-react";
import StatsGrid from "../StatsGrid";
import FilterBar from "../FilterBar";
import Pagination from "../Pagination";
import {
  useGetUnassignedWorkersQuery,
  useGetPreviousBookingWorkersQuery,
  useAssignBookingMutation,
  useReassignBookingMutation,
  useGetWorkersQuery,
  useGetAllBookingsQuery,
  useGetServicesQuery,
  useUpdateBookingMutation,
  useSendPaymentLinkMutation,
  useSendBothOtpMutation,
  useUpdateWorkerLocationMutation,
  useGetInstantBookingExtensionsQuery,
  useGetRescheduleHistoryQuery,
  useGetSubscriptionTypesQuery,
  useGetServiceCategoriesQuery,
  useGetCitiesQuery,
  useExportBookingsReportMutation,
  useGetCoordinatorsQuery,
  useAssignCoordinatorMutation,
  useReassignCoordinatorMutation,
} from "../../api/apiSlice";
import TableSkeleton from "../TableSkeleton";
import { toast } from "react-hot-toast";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { formatDateTime12 } from "../../utils/date";
import BookingsTable from "./BookingsTable";
import BookingCard from "./BookingCard";
import AssignWorkerModal from "./AssignWorkerModal";
import CoordinatorModal from "./CoordinatorModal";
import RescheduleHistoryModal from "./RescheduleHistoryModal";
import InstantExtensionsModal from "./InstantExtensionsModal";
import BookingDetailsModal from "./BookingDetailsModal";
import ExportBookingsModal from "./ExportBookingsModal";
import EditBookingModal from "./EditBookingModal";

const EMPTY_ARRAY = [];
const EMPTY_BOOKINGS_RESPONSE = { data: EMPTY_ARRAY, meta: null };

/**
 * Full bookings management page (stats, filters, table/cards, pagination,
 * all booking modals) locked to a single service category. Used by any
 * "Hobit <X>" page — pass a different categoryName/title per page. The
 * category's id is resolved dynamically from useGetServiceCategoriesQuery.
 */
const CategoryBookingsPage = ({
  categoryName,
  title,
  description,
  exportFilePrefix,
  pageKey,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReassignMode, setIsReassignMode] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [debouncedWorkerSearch, setDebouncedWorkerSearch] = useState("");
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = useState(false);
  const [isCoordinatorReassignMode, setIsCoordinatorReassignMode] =
    useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [selectedCoordinatorIds, setSelectedCoordinatorIds] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [instantBookingId, setInstantBookingId] = useState(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleBookingId, setRescheduleBookingId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [isBookingDetailsModalOpen, setIsBookingDetailsModalOpen] =
    useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: "pdf",
    status: "",
    payment_status: "",
    subscription_type_id: "",
    category_id: "", // resolved once categories load; locked to this page's category
    city_id: "",
    from_date: "",
    to_date: "",
    today: false,
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedWorkerSearch(workerSearch.trim());
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [workerSearch]);

  useEffect(() => {
    if (!isAssignModalOpen) {
      setWorkerSearch("");
      setDebouncedWorkerSearch("");
    }
  }, [isAssignModalOpen]);

  const { data: serviceCategories = [] } = useGetServiceCategoriesQuery();
  const categoryId = useMemo(
    () =>
      serviceCategories.find(
        (c) => c.name?.trim().toLowerCase() === categoryName.trim().toLowerCase(),
      )?.id,
    [serviceCategories, categoryName],
  );

  const getGetBookingsParams = (tab, page, search, fromDateVal, toDateVal) => {
    const normalized = String(tab || "All").toLowerCase();
    const searchParams = search?.trim() ? { search: search.trim() } : {};
    const hasDateRange = Boolean(fromDateVal || toDateVal);
    const categoryParams = { category_id: categoryId };
    const dateParams = {
      ...(fromDateVal ? { from_date: fromDateVal } : {}),
      ...(toDateVal ? { to_date: toDateVal } : {}),
    };

    if (normalized === "rescheduled") {
      return {
        page,
        rescheduled: "upcoming",
        ...categoryParams,
        ...dateParams,
        ...searchParams,
      };
    }

    if (hasDateRange) {
      const statusParams = {};
      if (normalized !== "today" && normalized !== "all") {
        statusParams.status = normalized;
      }
      return {
        page,
        ...dateParams,
        ...statusParams,
        ...categoryParams,
        ...searchParams,
      };
    }

    if (normalized === "today") {
      return { page, today: true, ...categoryParams, ...searchParams };
    }
    if (normalized === "all") {
      return { page, ...categoryParams, ...dateParams, ...searchParams };
    }
    return {
      page,
      status: normalized,
      ...categoryParams,
      ...dateParams,
      ...searchParams,
    };
  };

  const bookingApiParams = {
    ...getGetBookingsParams(
      statusFilter,
      currentPage,
      debouncedSearchTerm,
      fromDate,
      toDate,
    ),
    per_page: perPage,
  };

  const {
    data: allBookingsResponse = EMPTY_BOOKINGS_RESPONSE,
    isLoading,
    isFetching: isFetchingAllBookings,
    refetch: refetchBookings,
  } = useGetAllBookingsQuery(bookingApiParams, {
    skip: !categoryId,
    refetchOnMountOrArgChange: true,
  });
  const { data: allWorkers = [] } = useGetWorkersQuery();
  const { data: allCoordinators = [] } = useGetCoordinatorsQuery();
  const { data: allServices = [] } = useGetServicesQuery();
  const { data: subscriptionTypes = [] } = useGetSubscriptionTypesQuery();
  const { data: cities = [] } = useGetCitiesQuery();
  const {
    data: unassignedWorkers = [],
    isLoading: isLoadingWorkers,
    isFetching: isFetchingUnassignedWorkers,
  } = useGetUnassignedWorkersQuery(
    {
      bookingId: selectedBooking?.originalId,
      search: debouncedWorkerSearch || undefined,
    },
    {
      skip: !isAssignModalOpen || !selectedBooking?.originalId,
      refetchOnMountOrArgChange: true,
    },
  );
  const { data: previousBookingWorkers = [] } =
    useGetPreviousBookingWorkersQuery(selectedBooking?.originalId, {
      skip: !isAssignModalOpen || !selectedBooking?.originalId,
      refetchOnMountOrArgChange: true,
    });
  const [assignBooking, { isLoading: isAssigning }] =
    useAssignBookingMutation();
  const [reassignBooking, { isLoading: isReassigning }] =
    useReassignBookingMutation();
  const [updateBooking, { isLoading: isUpdating }] = useUpdateBookingMutation();
  const [assignCoordinator, { isLoading: isAssigningCoordinator }] =
    useAssignCoordinatorMutation();
  const [reassignCoordinator, { isLoading: isReassigningCoordinator }] =
    useReassignCoordinatorMutation();
  const [
    exportBookingsReport,
    { isLoading: isExportingReport, reset: resetExportMutation },
  ] = useExportBookingsReportMutation();
  const [sendPaymentLink] = useSendPaymentLinkMutation();
  const [sendBothOtp] = useSendBothOtpMutation();
  const [updateWorkerLocation] = useUpdateWorkerLocationMutation();
  const { data: instantBooking, isLoading: isLoadingExtensions } =
    useGetInstantBookingExtensionsQuery(instantBookingId, {
      skip: !isExtensionsModalOpen || !instantBookingId,
    });
  const { data: rescheduleData, isLoading: isLoadingReschedule } =
    useGetRescheduleHistoryQuery(rescheduleBookingId, {
      skip: !isRescheduleModalOpen || !rescheduleBookingId,
    });

  const [bookings, setBookings] = useState([]);
  const bookingsSource = allBookingsResponse?.data ?? EMPTY_ARRAY;
  const isBookingsLoading = isLoading || !categoryId;
  const isBookingsRefreshing = isFetchingAllBookings;
  const filterMeta = allBookingsResponse?.meta || null;
  const apiStats = allBookingsResponse?.stats || null;

  const filteredWorkers = useMemo(() => {
    // If using the new API with booking ID, unassignedWorkers is already filtered by the backend
    if (selectedBooking?.originalId && Array.isArray(unassignedWorkers)) {
      return unassignedWorkers;
    }

    if (!selectedBooking?.serviceType) return [];

    const requiredService = selectedBooking.serviceType.toLowerCase();
    const serviceMap = new Map(
      allServices.map((s) => [s.id, s.name.toLowerCase()]),
    );

    return unassignedWorkers.filter((worker) => {
      // Normalize worker services to an array of strings
      let workerServices = [];
      if (worker.services && Array.isArray(worker.services)) {
        workerServices = worker.services.map((s) =>
          typeof s === "object" ? s.name : s,
        );
      } else if (worker.service) {
        workerServices = [
          typeof worker.service === "object"
            ? worker.service.name
            : worker.service,
        ];
      }

      // Handle service_ids from new API structure
      if (worker.service_ids && Array.isArray(worker.service_ids)) {
        const mappedServices = worker.service_ids
          .map((id) => serviceMap.get(id))
          .filter(Boolean);
        workerServices = [...workerServices, ...mappedServices];
      }

      // Simple fuzzy match or check inclusion
      return workerServices.some(
        (s) => s && requiredService.includes(s.toLowerCase()),
      );
    });
  }, [unassignedWorkers, selectedBooking, allServices]);

  useEffect(() => {
    // Shallow compare helper to avoid unnecessary state updates
    const shallowEqualBookings = (a, b) => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        const x = a[i];
        const y = b[i];
        if (
          x.id !== y.id ||
          x.status !== y.status ||
          x.workerId !== y.workerId ||
          x.time !== y.time
        ) {
          return false;
        }
      }
      return true;
    };

    if (bookingsSource.length > 0) {
      const workerMap = new Map(allWorkers.map((w) => [w.id, w]));
      const coordinatorMap = new Map(allCoordinators.map((c) => [c.id, c]));
      const subTypeMap = new Map(subscriptionTypes.map((s) => [s.id, s.name]));

      const mappedBookings = bookingsSource.map((booking) => {
        const worker = booking.worker_id
          ? workerMap.get(booking.worker_id)
          : null;

        // Multi-worker support
        const workerIds = Array.isArray(booking.worker_ids)
          ? booking.worker_ids
          : [];

        const assignedWorkers = workerIds
          .map((id) => workerMap.get(id))
          .filter(Boolean);

        const workerNames = assignedWorkers.map((w) => w.name).join(", ");
        const coordinatorIds = Array.isArray(booking.coordinator_ids)
          ? booking.coordinator_ids
          : [];
        const coordinatorObjects =
          Array.isArray(booking.coordinators) && booking.coordinators.length > 0
            ? booking.coordinators
            : coordinatorIds
                .map((id) => coordinatorMap.get(id))
                .filter(Boolean);

        // Try to parse bot_payload for fallback data
        let formData = {};
        try {
          if (typeof booking.bot_payload === "string") {
            formData = JSON.parse(booking.bot_payload);
          } else if (typeof booking.bot_payload === "object") {
            formData = booking.bot_payload || {};
          }
        } catch (e) {
          console.warn("Failed to parse bot_payload", e);
        }

        const extractValue = (keyPart) => {
          const key = Object.keys(formData).find((k) =>
            k.toLowerCase().includes(keyPart.toLowerCase()),
          );
          return key ? formData[key] : null;
        };

        // Determine primary service from booking.services (non-addon) or top-level service
        const mainServiceEntry =
          Array.isArray(booking.services) && booking.services.length > 0
            ? booking.services.find((s) => !s.is_addon) || booking.services[0]
            : null;

        const serviceType =
          mainServiceEntry?.service?.name ||
          booking.service?.name ||
          extractValue("Service") ||
          "Standard Cleaning";

        // Aggregate all non-addon services (group duplicates by service_id, sum quantity)
        const serviceCountsMap = new Map();
        if (Array.isArray(booking.services)) {
          booking.services
            .filter((s) => !s.is_addon)
            .forEach((s) => {
              const name = s.service?.name || "Service";
              const key = s.service_id || s.service?.id || name;
              const qty = Number(s.quantity) || 1;
              const existing = serviceCountsMap.get(key);
              if (existing) {
                existing.quantity += qty;
              } else {
                serviceCountsMap.set(key, {
                  id: key,
                  name,
                  quantity: qty,
                  price: s.price || "0",
                });
              }
            });
        }
        const bookedServices = Array.from(serviceCountsMap.values());

        let time = booking.time_slot || extractValue("Time_Slot") || "N/A";
        time = time.replace(/^\d+_/, "").replace(/_/g, " ");

        // Derive subscription start/end dates (for monthly/recurring bookings)
        const subscriptionStart =
          booking.start_date ||
          (Array.isArray(booking.services) &&
            booking.services[0]?.start_date) ||
          null;
        const subscriptionEnd =
          booking.end_date ||
          (Array.isArray(booking.services) && booking.services[0]?.end_date) ||
          null;

        // Collect add-ons attached to this booking
        const addons = Array.isArray(booking.services)
          ? booking.services
              .filter((s) => s.is_addon)
              .map((s) => ({
                id: s.id,
                name: s.addon_name || s.addon?.name || "Add-on",
                quantity: s.addon_qty || s.quantity || 1,
                price: s.addon_price || s.price || "0",
              }))
          : [];

        return {
          id: `NSK-${booking.id}`,
          originalId: booking.id,
          customerId: booking.customer_id
            ? `C-${booking.customer_id}`
            : `C-${booking.id}`,
          customerName:
            booking.customer_name ||
            extractValue("Enter_Full_Name") ||
            "Unknown",
          customerPhone:
            booking.customer_phone || extractValue("Contact_Number") || "N/A",
          workerId: booking.worker_id || booking.worker?.id || null,
          workerName:
            workerNames ||
            booking.worker?.name ||
            (worker ? worker.name : null),
          workerIds,
          assignedWorkers,
          coordinatorIds,
          coordinators: coordinatorObjects,
          serviceType,
          bookedServices,
          workersRequired:
            booking.workers != null ? Number(booking.workers) : null,
          serviceGroup: booking.service?.service_group || null,
          sizeType: booking.service?.size_type || null,
          sizeValue: booking.service?.size_value || null,
          subscriptionName: booking.service?.subscription_id
            ? subTypeMap.get(booking.service.subscription_id)
            : null,
          category: booking.service?.category?.name || "Cleaning",
          date: (() => {
            const d = booking.booking_date;
            if (d === "Tomorrow" && booking.created_at) {
              const date = new Date(booking.created_at);
              date.setDate(date.getDate() + 1);
              return date.toISOString().split("T")[0];
            }
            if (d === "Today" && booking.created_at) {
              return booking.created_at.split("T")[0];
            }
            return (
              (d && d.split("T")[0]) ||
              extractValue("Choose_Date") ||
              booking.created_at?.split(/[T ]/)[0] ||
              "N/A"
            );
          })(),
          time,
          location: booking.address || extractValue("Address") || "N/A",
          createdAt: formatDateTime12(booking.created_at),
          serviceStartedAt: formatDateTime12(booking.service_started_at),
          serviceEndedAt: formatDateTime12(booking.service_ended_at),
          platformFee: booking.platform_fee ?? null,
          travellingCharge: booking.travelling_charge ?? null,
          taxAmount: booking.tax_amount ?? null,
          rainCharge: booking.rain_charge ?? null,
          payment_status: booking.payment_status || "Pending",
          status: booking.status
            ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
            : "Pending",
          amount: booking.amount || "0",
          source: booking.source,
          subscriptionStart,
          subscriptionEnd,
          addons,
          commission: 0, // Default for now
          hasRescheduleHistory: Boolean(
            (booking.reschedule_history &&
              booking.reschedule_history.length > 0) ||
            booking.reschedule_count > 0 ||
            (booking.reschedule_logs && booking.reschedule_logs.length > 0),
          ),
        };
      });

      setBookings((prev) =>
        shallowEqualBookings(prev, mappedBookings) ? prev : mappedBookings,
      );
    } else {
      setBookings((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY));
    }
  }, [bookingsSource, allWorkers, allCoordinators, subscriptionTypes]);

  const handleViewExtensions = (booking) => {
    setInstantBookingId(booking.originalId);
    setIsExtensionsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleViewRescheduleHistory = (booking) => {
    setRescheduleBookingId(booking.originalId);
    setIsRescheduleModalOpen(true);
    setActiveMenuId(null);
  };

  const handleShowBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setIsBookingDetailsModalOpen(true);
    setActiveMenuId(null);
  };

  const statuses = [
    "Today",
    "All",
    "Pending",
    "Inprogress",
    "Completed",
    "Assigned",
    "Cancelled",
    "Paused",
    "Rescheduled",
  ];

  const trimmedSearchTerm = debouncedSearchTerm.trim().toLowerCase();
  const isServerSearchActive = Boolean(trimmedSearchTerm);

  const filteredBookings = isServerSearchActive
    ? bookings
    : bookings.filter((booking) => {
        const matchesSearch =
          booking.id.toLowerCase().includes(trimmedSearchTerm) ||
          booking.customerName.toLowerCase().includes(trimmedSearchTerm) ||
          (booking.workerName &&
            booking.workerName.toLowerCase().includes(trimmedSearchTerm)) ||
          (booking.location &&
            booking.location.toLowerCase().includes(trimmedSearchTerm));

        return matchesSearch;
      });

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, fromDate, toDate, perPage]);

  const serverPerPage = Number(filterMeta?.per_page || perPage);
  const serverTotal = Number(filterMeta?.total || 0);
  const serverLastPage = Number(filterMeta?.last_page || 1);
  const indexOfLastItem = currentPage * serverPerPage;
  const indexOfFirstItem = indexOfLastItem - serverPerPage;
  const currentItems = filteredBookings;
  const totalPages = serverLastPage;

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleAssignClick = (booking) => {
    setSelectedBooking(booking);
    setSelectedWorkerIds([]);
    setIsReassignMode(false);
    setIsAssignModalOpen(true);
  };

  const handleReassignClick = (booking) => {
    setSelectedBooking(booking);
    setSelectedWorkerIds(booking.workerIds || []);
    setIsReassignMode(true);
    setIsAssignModalOpen(true);
  };

  const handleAssignCoordinatorClick = (booking) => {
    setSelectedBooking(booking);
    setSelectedCoordinatorIds([]);
    setIsCoordinatorReassignMode(false);
    setSendWhatsappAfterCoordinatorSave(true);
    setIsCoordinatorModalOpen(true);
  };

  const handleReassignCoordinatorClick = (booking) => {
    setSelectedBooking(booking);
    setSelectedCoordinatorIds(booking.coordinatorIds || []);
    setIsCoordinatorReassignMode(true);
    setSendWhatsappAfterCoordinatorSave(true);
    setIsCoordinatorModalOpen(true);
  };

  const toggleWorkerSelection = (workerId) => {
    setSelectedWorkerIds((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId],
    );
  };

  const toggleCoordinatorSelection = (coordinatorId) => {
    setSelectedCoordinatorIds((prev) =>
      prev.includes(coordinatorId)
        ? prev.filter((id) => id !== coordinatorId)
        : [...prev, coordinatorId],
    );
  };

  const handleSaveAssignment = async () => {
    if (!selectedBooking || selectedWorkerIds.length === 0) {
      toast.error("Please select at least one worker");
      return;
    }

    try {
      const payload = {
        booking_id: selectedBooking.originalId,
        worker_ids: selectedWorkerIds,
      };

      if (isReassignMode) {
        await reassignBooking(payload).unwrap();
        toast.success("Workers reassigned successfully!");
      } else {
        await assignBooking(payload).unwrap();
        toast.success("Workers assigned successfully!");
      }

      // Send Both OTP (Start & Close)
      try {
        await sendBothOtp({
          booking_id: selectedBooking.originalId,
        }).unwrap();
      } catch (otpError) {
        console.error("Failed to send OTPs:", otpError);
      }

      // Update Worker Location (Static)
      try {
        await updateWorkerLocation({
          booking_id: selectedBooking.originalId,
          latitude: "19.9975",
          longitude: "73.7898",
        }).unwrap();
      } catch (locError) {
        console.error("Failed to update worker location:", locError);
      }

      // Refresh data from API
      refetchBookings();

      // Update local state for immediate feedback
      const selectedWorkerObjects = allWorkers.filter((w) =>
        selectedWorkerIds.includes(w.id),
      );
      const workerNames = selectedWorkerObjects.map((w) => w.name).join(", ");

      setBookings((prev) =>
        prev.map((b) => {
          if (b.id === selectedBooking.id) {
            return {
              ...b,
              workerIds: selectedWorkerIds,
              workerName: workerNames,
              assignedWorkers: selectedWorkerObjects,
              status: "Assigned",
            };
          }
          return b;
        }),
      );

      setIsAssignModalOpen(false);
      setSelectedBooking(null);
      setSelectedWorkerIds([]);
      setIsReassignMode(false);
    } catch (error) {
      console.error("Failed to assign workers:", error);
      toast.error(
        error.data?.message || "Failed to assign workers. Please try again.",
      );
    }
  };

  const handleSaveCoordinatorAssignment = async () => {
    if (!selectedBooking || selectedCoordinatorIds.length === 0) {
      toast.error("Please select at least one coordinator");
      return;
    }

    try {
      const payload = {
        booking_id: selectedBooking.originalId,
        coordinator_ids: selectedCoordinatorIds,
      };

      if (isCoordinatorReassignMode) {
        await reassignCoordinator(payload).unwrap();
        toast.success("Coordinators reassigned successfully!");
      } else {
        await assignCoordinator(payload).unwrap();
        toast.success("Coordinator assigned successfully!");
      }

      refetchBookings();

      const selectedCoordinatorObjects = allCoordinators.filter((c) =>
        selectedCoordinatorIds.includes(c.id),
      );

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === selectedBooking.id
            ? {
                ...booking,
                coordinatorIds: selectedCoordinatorIds,
                coordinators: selectedCoordinatorObjects,
              }
            : booking,
        ),
      );

      setIsCoordinatorModalOpen(false);
      setSelectedBooking(null);
      setSelectedCoordinatorIds([]);
      setIsCoordinatorReassignMode(false);
    } catch (error) {
      console.error("Failed to assign coordinators:", error);
      toast.error(
        error?.data?.message ||
          "Failed to assign coordinators. Please try again.",
      );
    }
  };

  const handleSendPaymentLink = async (booking) => {
    let phone = booking.customerPhone || "";
    // Remove non-digit characters
    phone = phone.replace(/\D/g, "");

    // Basic validation
    if (phone.length < 10) {
      toast.error("Invalid customer phone number");
      return;
    }

    // Prefill 91 if it's a 10-digit number or doesn't start with 91
    if (phone.length === 10) {
      phone = "91" + phone;
    } else if (!phone.startsWith("91")) {
      phone = "91" + phone;
    }

    try {
      await sendPaymentLink({
        booking_id: booking.originalId,
        amount: booking.amount,
        phone: phone,
      }).unwrap();

      toast.success("Payment link sent successfully!");
      setActiveMenuId(null);
    } catch (error) {
      console.error("Failed to send payment link:", error);
      toast.error(
        error.data?.message || "Failed to send payment link. Please try again.",
      );
    }
  };

  const handleSendBothOtp = async (booking) => {
    try {
      await sendBothOtp({
        booking_id: booking.originalId,
      }).unwrap();
      toast.success("Both OTPs sent successfully!");
      setActiveMenuId(null);
    } catch (error) {
      console.error("Failed to send OTPs:", error);
      toast.error(
        error.data?.message || "Failed to send OTPs. Please try again.",
      );
    }
  };

  const handleUpdateLocationSubmit = async (booking) => {
    try {
      await updateWorkerLocation({
        booking_id: booking.originalId,
        latitude: "19.9975",
        longitude: "73.7898",
      }).unwrap();
      toast.success("Worker location updated successfully");
      setActiveMenuId(null);
    } catch (error) {
      console.error("Failed to update location:", error);
      toast.error(error.data?.message || "Failed to update worker location");
    }
  };

  const handleEditBooking = (booking) => {
    setEditBooking({
      ...booking,
      booking_date: booking.date || booking.booking_date,
      time_slot: booking.time || booking.time_slot,
      status: booking.status,
      payment_status: booking.payment_status,
    });
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleUpdateBooking = async (bookingData) => {
    try {
      // Extract numeric ID from booking ID (remove any prefixes like "BK-")
      const numericId = editBooking.id.replace(/[^0-9]/g, "");
      await updateBooking({ id: numericId, ...bookingData }).unwrap();

      // Update local state immediately for instant UI feedback
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === editBooking.id
            ? {
                ...booking,
                date: bookingData.booking_date || booking.date,
                subscriptionStart:
                  bookingData.start_date || booking.subscriptionStart,
                subscriptionEnd:
                  bookingData.end_date || booking.subscriptionEnd,
                time: bookingData.time_slot || booking.time,
                status: bookingData.status,
                payment_status: bookingData.payment_status,
              }
            : booking,
        ),
      );

      toast.success("Booking updated successfully");
      setIsEditModalOpen(false);
      setEditBooking(null);

      // Also refetch to ensure server-side consistency
      refetchBookings();
    } catch (error) {
      toast.error(error.data?.message || "Failed to update booking");
      console.error(error);
    }
  };

  const buildExportParams = (opts) => {
    const normalizedStatus = String(opts.status || "").toLowerCase();
    const isRescheduled = normalizedStatus === "rescheduled";
    const statusParam =
      normalizedStatus &&
      normalizedStatus !== "all" &&
      normalizedStatus !== "today" &&
      normalizedStatus !== "rescheduled"
        ? normalizedStatus
        : "";

    const hasDateRange = Boolean(opts.from_date || opts.to_date);
    const todayFlag = Boolean(opts.today) && !hasDateRange;

    const fromDateParam = opts.from_date || "";
    const toDateParam = opts.to_date || "";
    const legacyDateParam = fromDateParam && !toDateParam ? fromDateParam : "";

    return {
      format: opts.format || "pdf",
      ...(statusParam ? { status: statusParam } : {}),
      ...(isRescheduled ? { rescheduled: "upcoming" } : {}),
      ...(fromDateParam ? { from_date: fromDateParam } : {}),
      ...(toDateParam ? { to_date: toDateParam } : {}),
      ...(legacyDateParam ? { date: legacyDateParam } : {}),
      ...(todayFlag ? { today: 1 } : {}),
      ...(opts.subscription_type_id
        ? { subscription_type_id: opts.subscription_type_id }
        : {}),
      ...(opts.payment_status ? { payment_status: opts.payment_status } : {}),
      ...(opts.category_id ? { category_id: opts.category_id } : {}),
      ...(opts.city_id ? { city_id: opts.city_id } : {}),
    };
  };

  const openExportModal = (targetFormat) => {
    const normalizedStatus = String(statusFilter || "").toLowerCase();
    const statusForExport =
      normalizedStatus &&
      normalizedStatus !== "today" &&
      normalizedStatus !== "all"
        ? normalizedStatus
        : "";
    const todayFlag = normalizedStatus === "today" && !fromDate && !toDate;

    setExportOptions({
      format: targetFormat || "pdf",
      status: statusForExport,
      payment_status: "",
      subscription_type_id: "",
      // Lock category to this page's category
      category_id: categoryId,
      city_id: "",
      from_date: fromDate || "",
      to_date: toDate || "",
      today: todayFlag,
    });
    setIsExportModalOpen(true);
  };

  const readJsonFromBlob = async (blob) => {
    try {
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const handleExportReport = async () => {
    try {
      const params = buildExportParams(exportOptions);
      const blob = await exportBookingsReport(params).unwrap();

      if (blob?.type && blob.type.includes("application/json")) {
        const json = await readJsonFromBlob(blob);
        toast.error(
          json?.message || "No bookings found for the selected filters.",
        );
        return;
      }

      const extension = params.format === "excel" ? "xlsx" : "pdf";
      const statusSuffix =
        params.status && params.status !== "all" ? `_${params.status}` : "";
      const dateSuffix =
        params.from_date && params.to_date
          ? `_${params.from_date}_to_${params.to_date}`
          : params.from_date
            ? `_${params.from_date}`
            : params.to_date
              ? `_${params.to_date}`
              : "";

      saveAs(
        blob,
        `${exportFilePrefix}${statusSuffix}${dateSuffix}_${format(
          new Date(),
          "yyyyMMdd_HHmmss",
        )}.${extension}`,
      );
      setIsExportModalOpen(false);
    } catch (error) {
      console.error("Failed to export report:", error);
      let message = "Failed to export report";
      if (error?.data instanceof Blob) {
        const json = await readJsonFromBlob(error.data);
        if (json?.message) message = json.message;
      } else if (error?.data?.message) {
        message = error.data.message;
      }
      toast.error(message);
    } finally {
      // Drop the Blob from RTK Query's cache so the serializability check is happy
      resetExportMutation();
    }
  };

  // Configuration for StatsGrid
  const completedBookingsCount =
    Number(apiStats?.completed_bookings) ||
    bookings.filter((b) => b.status === "Completed").length;
  const pendingBookingsCount =
    Number(apiStats?.pending_bookings) ||
    bookings.filter((b) => b.status === "Pending").length;
  const cancelledBookingsCount =
    Number(apiStats?.cancelled_bookings) ||
    bookings.filter((b) => b.status === "Cancelled").length;
  const assignedBookingsCount =
    Number(apiStats?.assigned_bookings) ||
    bookings.filter((b) => b.status === "Assigned").length;
  const inProgressBookingsCount =
    Number(apiStats?.inprogress_bookings) ||
    bookings.filter(
      (b) => b.status === "Inprogress" || b.status === "In Progress",
    ).length;
  const totalBookingsCount =
    Number(apiStats?.total_bookings) ||
    Number(filterMeta?.total) ||
    bookings.length;
  const pausedBookingsCount = Number(apiStats?.paused_bookings) || 0;
  const rescheduledBookingsCount = Number(apiStats?.rescheduled_bookings) || 0;
  const activeSubscriptionsCount = Number(apiStats?.active_subscriptions) || 0;

  const statsData = [
    {
      label: "Active Subscriptions",
      value: activeSubscriptionsCount,
      colorClass: "text-teal-600",
    },
    {
      label: "Completed Bookings",
      value: completedBookingsCount,
      colorClass: "text-green-600",
      onClick: () => setStatusFilter("Completed"),
    },
    {
      label: "Pending Bookings",
      value: pendingBookingsCount,
      colorClass: "text-yellow-600",
      isBlinking: pendingBookingsCount > 0,
      onClick: () => setStatusFilter("Pending"),
    },
    {
      label: "In Progress Bookings",
      value: inProgressBookingsCount,
      colorClass: "text-indigo-600",
      onClick: () => setStatusFilter("Inprogress"),
    },
    {
      label: "Assigned Bookings",
      value: assignedBookingsCount,
      colorClass: "text-blue-600",
      onClick: () => setStatusFilter("Assigned"),
    },
    {
      label: "Rejected Bookings",
      value: cancelledBookingsCount,
      colorClass: "text-red-600",
      onClick: () => setStatusFilter("Cancelled"),
    },
    {
      label: "Paused Bookings",
      value: pausedBookingsCount,
      colorClass: "text-orange-600",
      onClick: () => setStatusFilter("Paused"),
    },
    {
      label: "Rescheduled Bookings",
      value: rescheduledBookingsCount,
      colorClass: "text-purple-600",
      onClick: () => setStatusFilter("Rescheduled"),
    },
    {
      label: "Total Bookings",
      value: totalBookingsCount,
      onClick: () => setStatusFilter("All"),
    },
  ];

  // Configuration for FilterBar
  const filterTabs = statuses.map((status) => ({
    id: status,
    label: status,
  }));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search ID, customer, worker or location..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openExportModal("pdf")}
              disabled={isExportingReport}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={18} />
              <span className="font-medium">Export PDF</span>
            </button>
            <button
              onClick={() => openExportModal("excel")}
              disabled={isExportingReport}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={18} />
              <span className="font-medium">Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid
        stats={statsData}
        bottomRightSlot={
          <button
            onClick={refetchBookings}
            disabled={isBookingsRefreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isBookingsRefreshing ? "Refreshing..." : "Refresh Bookings"}
          </button>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        tabs={filterTabs}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search ID, customer, worker or location..."
        showSearch={false}
        rightSlot={
          <div className="w-full flex flex-col sm:flex-row sm:flex-wrap xl:flex-nowrap items-stretch sm:items-center gap-2">
            {/* Date range */}
            <div
              className={`w-full sm:w-[210px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${fromDate ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50"}`}
            >
              <Calendar
                size={14}
                className={fromDate ? "text-primary" : "text-gray-400"}
              />
              <label
                className={`text-xs font-medium whitespace-nowrap ${fromDate ? "text-primary" : "text-gray-500"}`}
              >
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-sm outline-none text-gray-700 w-full min-w-0 cursor-pointer"
              />
            </div>
            <div
              className={`w-full sm:w-[210px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${toDate ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50"}`}
            >
              <Calendar
                size={14}
                className={toDate ? "text-primary" : "text-gray-400"}
              />
              <label
                className={`text-xs font-medium whitespace-nowrap ${toDate ? "text-primary" : "text-gray-500"}`}
              >
                To
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-sm outline-none text-gray-700 w-full min-w-0 cursor-pointer"
              />
            </div>

            {/* Clear date filter */}
            {(fromDate || toDate) && (
              <button
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <X size={12} />
                Clear Dates
              </button>
            )}
          </div>
        }
      />

      {/* Bookings Table - Desktop View */}
      {isBookingsLoading ? (
        <TableSkeleton columns={8} rows={5} />
      ) : (
        <BookingsTable
          currentItems={currentItems}
          filteredBookings={filteredBookings}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          instantBooking={instantBooking}
          instantBookingId={instantBookingId}
          handleShowBookingDetails={handleShowBookingDetails}
          handleAssignClick={handleAssignClick}
          handleReassignClick={handleReassignClick}
          handleAssignCoordinatorClick={handleAssignCoordinatorClick}
          handleReassignCoordinatorClick={handleReassignCoordinatorClick}
          handleEditBooking={handleEditBooking}
          handleSendPaymentLink={handleSendPaymentLink}
          handleSendBothOtp={handleSendBothOtp}
          handleViewExtensions={handleViewExtensions}
          handleViewRescheduleHistory={handleViewRescheduleHistory}
        />
      )}

      {/* Bookings List - Mobile View */}
      <BookingCard
        currentItems={currentItems}
        activeMenuId={activeMenuId}
        setActiveMenuId={setActiveMenuId}
        handleShowBookingDetails={handleShowBookingDetails}
        handleAssignClick={handleAssignClick}
        handleReassignClick={handleReassignClick}
        handleAssignCoordinatorClick={handleAssignCoordinatorClick}
        handleReassignCoordinatorClick={handleReassignCoordinatorClick}
        handleSendPaymentLink={handleSendPaymentLink}
        handleSendBothOtp={handleSendBothOtp}
        handleUpdateLocationSubmit={handleUpdateLocationSubmit}
        handleViewExtensions={handleViewExtensions}
        handleViewRescheduleHistory={handleViewRescheduleHistory}
      />

      {/* Pagination */}
      {filteredBookings.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          fromItem={Math.max(1, indexOfFirstItem + 1)}
          toItem={Math.min(indexOfLastItem, serverTotal)}
          totalItems={serverTotal}
          perPage={perPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setCurrentPage(1);
          }}
          selectId={`${pageKey}-rows-per-page`}
        />
      )}

      {/* Worker Assignment Modal */}
      <AssignWorkerModal
        isAssignModalOpen={isAssignModalOpen}
        setIsAssignModalOpen={setIsAssignModalOpen}
        selectedBooking={selectedBooking}
        isReassignMode={isReassignMode}
        previousBookingWorkers={previousBookingWorkers}
        selectedWorkerIds={selectedWorkerIds}
        toggleWorkerSelection={toggleWorkerSelection}
        workerSearch={workerSearch}
        setWorkerSearch={setWorkerSearch}
        debouncedWorkerSearch={debouncedWorkerSearch}
        filteredWorkers={filteredWorkers}
        isLoadingWorkers={isLoadingWorkers}
        isFetchingUnassignedWorkers={isFetchingUnassignedWorkers}
        isAssigning={isAssigning}
        isReassigning={isReassigning}
        handleSaveAssignment={handleSaveAssignment}
      />

      {/* Coordinator Assignment Modal */}
      <CoordinatorModal
        isCoordinatorModalOpen={isCoordinatorModalOpen}
        setIsCoordinatorModalOpen={setIsCoordinatorModalOpen}
        selectedBooking={selectedBooking}
        isCoordinatorReassignMode={isCoordinatorReassignMode}
        allCoordinators={allCoordinators}
        selectedCoordinatorIds={selectedCoordinatorIds}
        toggleCoordinatorSelection={toggleCoordinatorSelection}
        isAssigningCoordinator={isAssigningCoordinator}
        isReassigningCoordinator={isReassigningCoordinator}
        handleSaveCoordinatorAssignment={handleSaveCoordinatorAssignment}
      />

      {/* Reschedule History Modal */}
      <RescheduleHistoryModal
        isRescheduleModalOpen={isRescheduleModalOpen}
        setIsRescheduleModalOpen={setIsRescheduleModalOpen}
        setRescheduleBookingId={setRescheduleBookingId}
        rescheduleData={rescheduleData}
        isLoadingReschedule={isLoadingReschedule}
      />

      {/* Instant Booking Extensions Modal */}
      <InstantExtensionsModal
        isExtensionsModalOpen={isExtensionsModalOpen}
        setIsExtensionsModalOpen={setIsExtensionsModalOpen}
        setInstantBookingId={setInstantBookingId}
        instantBooking={instantBooking}
        isLoadingExtensions={isLoadingExtensions}
      />

      {/* Booking Details Modal */}
      <BookingDetailsModal
        isBookingDetailsModalOpen={isBookingDetailsModalOpen}
        setIsBookingDetailsModalOpen={setIsBookingDetailsModalOpen}
        selectedBooking={selectedBooking}
      />

      {/* Export Options Modal */}
      <ExportBookingsModal
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        exportOptions={exportOptions}
        setExportOptions={setExportOptions}
        isExportingReport={isExportingReport}
        handleExportReport={handleExportReport}
        subscriptionTypes={subscriptionTypes}
        serviceCategories={serviceCategories}
        cities={cities}
      />

      {/* Edit Booking Modal */}
      <EditBookingModal
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editBooking={editBooking}
        isUpdating={isUpdating}
        handleUpdateBooking={handleUpdateBooking}
      />
    </div>
  );
};

export default CategoryBookingsPage;
