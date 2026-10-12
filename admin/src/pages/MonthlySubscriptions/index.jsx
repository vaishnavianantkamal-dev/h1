import React, { useState, useEffect, useMemo } from "react";
import {
  MoreVertical,
  Calendar,
  Clock,
  Download,
  User,
  Star,
  MapPin,
  Check,
  CreditCard,
  Key,
  Edit,
  Eye,
  X,
  Search,
  MessageSquare,
  Bell,
  PauseCircle,
  History,
} from "lucide-react";
import StatsGrid from "../../components/StatsGrid";
import FilterBar from "../../components/FilterBar";
import Modal from "../../components/Modal";
import {
  useGetUnassignedWorkersQuery,
  useAssignBookingMutation,
  useReassignBookingMutation,
  useGetWorkersQuery,
  useGetAllBookingsQuery,
  useGetServicesQuery,
  useUpdateBookingStatusMutation,
  useUpdateBookingMutation,
  usePauseBookingSubscriptionMutation,
  useGetPauseHistoryQuery,
  useSendPaymentLinkMutation,
  useSendBothOtpMutation,
  useUpdateWorkerLocationMutation,
  useGetInstantBookingExtensionsQuery,
  useGetRescheduleHistoryQuery,
  useGetSubscriptionTypesQuery,
  useGetServiceCategoriesQuery,
  useGetTimeSlotsQuery,
  useExportBookingsReportMutation,
  useGetCoordinatorsQuery,
  useAssignCoordinatorMutation,
  useReassignCoordinatorMutation,
  useSendBookingToWhatsappCoordinatorMutation,
  useGetAlertsQuery,
  useMarkAlertsReadMutation,
} from "../../api/apiSlice";
import TableSkeleton from "../../components/TableSkeleton";
import { toast } from "react-hot-toast";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { formatDateTime12, toInputDate } from "../../utils/date";
import {
  getStatusColor,
  getPaymentStatusColor,
  getCategoryBadgeStyles,
} from "../../utils/bookingStatus";
import {
  LocationDisplay,
  ServiceNameDisplay,
  WorkerNamesDisplay,
  CoordinatorNamesDisplay,
  PauseBookingModal,
  PauseHistoryModal,
} from "../../components/booking";

const EMPTY_ARRAY = [];
const EMPTY_BOOKINGS_RESPONSE = { data: EMPTY_ARRAY, meta: null };

const formatTime12 = (t) => {
  if (!t) return "";
  const parts = String(t).split(":");
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] ?? "00";
  if (Number.isNaN(hour)) return t;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

const MonthlySubscriptions = () => {
  const ALERTS_ENABLED = false;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [subscriptionTypeId, setSubscriptionTypeId] = useState("4");
  const [slotFrom, setSlotFrom] = useState("");
  const [slotTo, setSlotTo] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
  const [
    sendWhatsappAfterCoordinatorSave,
    setSendWhatsappAfterCoordinatorSave,
  ] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [instantBookingId, setInstantBookingId] = useState(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleBookingId, setRescheduleBookingId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseBooking, setPauseBooking] = useState(null);
  const [isPauseHistoryModalOpen, setIsPauseHistoryModalOpen] =
    useState(false);
  const [pauseHistoryBookingId, setPauseHistoryBookingId] = useState(null);
  const [isBookingDetailsModalOpen, setIsBookingDetailsModalOpen] =
    useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: "pdf",
    status: "",
    payment_status: "",
    subscription_type_id: "4", // locked to Monthly
    category_id: "",
    from_date: "",
    to_date: "",
    slot_from: "",
    slot_to: "",
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

  const getGetBookingsParams = (
    tab,
    page,
    search,
    fromDateVal,
    toDateVal,
    subscriptionTypeIdVal,
    slotFromVal,
    slotToVal,
  ) => {
    const normalized = String(tab || "All").toLowerCase();
    const searchParams = search?.trim() ? { search: search.trim() } : {};
    const hasDateRange = Boolean(fromDateVal || toDateVal);
    const subscriptionParams = subscriptionTypeIdVal
      ? { subscription_type_id: subscriptionTypeIdVal }
      : {};
    const timeSlotParams = {
      ...(slotFromVal ? { slot_from: slotFromVal } : {}),
      ...(slotToVal ? { slot_to: slotToVal } : {}),
    };
    const dateParams = {
      ...(fromDateVal ? { from_date: fromDateVal } : {}),
      ...(toDateVal ? { to_date: toDateVal } : {}),
    };

    if (normalized === "rescheduled") {
      return {
        page,
        rescheduled: "upcoming",
        ...subscriptionParams,
        ...timeSlotParams,
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
        ...subscriptionParams,
        ...timeSlotParams,
        ...searchParams,
      };
    }

    if (normalized === "today") {
      return {
        page,
        today: true,
        ...subscriptionParams,
        ...timeSlotParams,
        ...searchParams,
      };
    }
    if (normalized === "all") {
      return {
        page,
        ...subscriptionParams,
        ...timeSlotParams,
        ...dateParams,
        ...searchParams,
      };
    }
    return {
      page,
      status: normalized,
      ...subscriptionParams,
      ...timeSlotParams,
      ...dateParams,
      ...searchParams,
    };
  };

  const bookingApiParams = getGetBookingsParams(
    statusFilter,
    currentPage,
    debouncedSearchTerm,
    fromDate,
    toDate,
    subscriptionTypeId,
    slotFrom,
    slotTo,
  );

  const {
    data: allBookingsResponse = EMPTY_BOOKINGS_RESPONSE,
    isLoading,
    isFetching: isFetchingAllBookings,
    refetch: refetchAllBookings,
  } = useGetAllBookingsQuery(bookingApiParams, {
    refetchOnMountOrArgChange: true,
  });
  const { data: allWorkers = [] } = useGetWorkersQuery();
  const { data: allCoordinators = [] } = useGetCoordinatorsQuery();
  const { data: allServices = [] } = useGetServicesQuery();
  const { data: subscriptionTypes = [] } = useGetSubscriptionTypesQuery();
  const { data: serviceCategories = [] } = useGetServiceCategoriesQuery();
  const { data: timeSlots = [] } = useGetTimeSlotsQuery();
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
  const [assignBooking, { isLoading: isAssigning }] =
    useAssignBookingMutation();
  const [reassignBooking, { isLoading: isReassigning }] =
    useReassignBookingMutation();
  const [updateBooking, { isLoading: isUpdating }] = useUpdateBookingMutation();
  const [pauseBookingSubscription, { isLoading: isPausing }] =
    usePauseBookingSubscriptionMutation();
  const [updateBookingStatus] = useUpdateBookingStatusMutation();
  const [assignCoordinator, { isLoading: isAssigningCoordinator }] =
    useAssignCoordinatorMutation();
  const [reassignCoordinator, { isLoading: isReassigningCoordinator }] =
    useReassignCoordinatorMutation();
  const [sendBookingToWhatsappCoordinator] =
    useSendBookingToWhatsappCoordinatorMutation();
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
  const { data: pauseHistoryData, isLoading: isLoadingPauseHistory } =
    useGetPauseHistoryQuery(pauseHistoryBookingId, {
      skip: !isPauseHistoryModalOpen || !pauseHistoryBookingId,
    });

  const {
    data: alertsPayload,
    isLoading: isAlertsLoading,
    refetch: refetchAlerts,
  } = useGetAlertsQuery(undefined, {
    skip: !ALERTS_ENABLED,
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [markAlertsRead, { isLoading: isMarkingAlertsRead }] =
    useMarkAlertsReadMutation();

  const [bookings, setBookings] = useState([]);
  const itemsPerPage = 20;
  const bookingsSource = allBookingsResponse?.data ?? EMPTY_ARRAY;
  const isBookingsLoading = isLoading;
  const isBookingsRefreshing = isFetchingAllBookings;
  const refetchBookings = () => {
    if (ALERTS_ENABLED) void refetchAlerts();
    return refetchAllBookings();
  };
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

  const handleViewPauseHistory = (booking) => {
    setPauseHistoryBookingId(booking.originalId);
    setIsPauseHistoryModalOpen(true);
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
  }, [
    debouncedSearchTerm,
    statusFilter,
    subscriptionTypeId,
    slotFrom,
    slotTo,
    fromDate,
    toDate,
  ]);

  const isServerPaginated = true;
  const serverPerPage = Number(filterMeta?.per_page || itemsPerPage);
  const serverTotal = Number(filterMeta?.total || 0);
  const serverLastPage = Number(filterMeta?.last_page || 1);

  const indexOfLastItem = isServerPaginated
    ? currentPage * serverPerPage
    : currentPage * itemsPerPage;
  const indexOfFirstItem = isServerPaginated
    ? indexOfLastItem - serverPerPage
    : indexOfLastItem - itemsPerPage;

  const currentItems = isServerPaginated
    ? filteredBookings
    : filteredBookings.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = isServerPaginated
    ? serverLastPage
    : Math.ceil(filteredBookings.length / itemsPerPage);

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

      if (sendWhatsappAfterCoordinatorSave) {
        const whatsappResults = await Promise.allSettled(
          selectedCoordinatorIds.map((coordinatorId) =>
            sendBookingToWhatsappCoordinator({
              booking_id: selectedBooking.originalId,
              coordinator_id: Number(coordinatorId),
            }).unwrap(),
          ),
        );

        const successCount = whatsappResults.filter(
          (result) => result.status === "fulfilled",
        ).length;

        if (successCount > 0) {
          toast.success(`WhatsApp sent to ${successCount} coordinator(s)`);
        } else {
          toast.error("Failed to send WhatsApp messages");
        }
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

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateBookingStatus({ id, status }).unwrap();
      toast.success(`Booking status updated to ${status}`);
      refetchBookings();
    } catch (error) {
      toast.error("Failed to update booking status");
      console.error(error);
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

  const handlePauseBookingClick = (booking) => {
    setPauseBooking(booking);
    setIsPauseModalOpen(true);
    setActiveMenuId(null);
  };

  const handlePauseBooking = async ({ pause_from, pause_until, reason }) => {
    if (!pauseBooking) return;

    try {
      await pauseBookingSubscription({
        booking_id: pauseBooking.originalId,
        pause_from,
        pause_until,
        reason,
      }).unwrap();

      toast.success("Booking paused successfully");
      setIsPauseModalOpen(false);
      setPauseBooking(null);
      refetchBookings();
    } catch (error) {
      console.error("Failed to pause booking:", error);
      toast.error(error.data?.message || "Failed to pause booking");
    }
  };

  const buildExportParams = (opts) => {
    const normalizedStatus = String(opts.status || "").toLowerCase();
    const statusParam =
      normalizedStatus &&
      normalizedStatus !== "all" &&
      normalizedStatus !== "today"
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
      ...(fromDateParam ? { from_date: fromDateParam } : {}),
      ...(toDateParam ? { to_date: toDateParam } : {}),
      ...(legacyDateParam ? { date: legacyDateParam } : {}),
      ...(todayFlag ? { today: 1 } : {}),
      ...(opts.subscription_type_id
        ? { subscription_type_id: opts.subscription_type_id }
        : {}),
      ...(opts.payment_status ? { payment_status: opts.payment_status } : {}),
      ...(opts.category_id ? { category_id: opts.category_id } : {}),
      ...(opts.slot_from ? { slot_from: opts.slot_from } : {}),
      ...(opts.slot_to ? { slot_to: opts.slot_to } : {}),
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
      // Lock subscription to Monthly for this page
      subscription_type_id: subscriptionTypeId || "4",
      category_id: "",
      from_date: fromDate || "",
      to_date: toDate || "",
      slot_from: slotFrom || "",
      slot_to: slotTo || "",
      today: todayFlag,
    });
    setIsExportModalOpen(true);
  };

  const readJsonFromBlob = async (blob) => {
    try {
      const text = await blob.text();
      return JSON.parse(text);
    } catch (_) {
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
        `monthly_subscriptions${statusSuffix}${dateSuffix}_${format(
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

  const bookingAlerts = alertsPayload?.alerts ?? [];
  const alertsUnreadCount = Number(alertsPayload?.unread_count) || 0;

  const isAlertUnread = (a) =>
    a?.is_read === 0 || a?.is_read === false || a?.is_read === "0";

  const handleMarkSingleAlertRead = async (alertId) => {
    try {
      const res = await markAlertsRead({
        alert_ids: [alertId],
        mark_all: false,
      }).unwrap();
      toast.success(res?.message || "Alert marked as read");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to mark alert as read");
    }
  };

  const handleMarkAllBookingAlertsRead = async () => {
    const unreadIds = bookingAlerts.filter(isAlertUnread).map((a) => a.id);
    if (unreadIds.length === 0) return;
    try {
      const res = await markAlertsRead({
        alert_ids: unreadIds,
        mark_all: false,
      }).unwrap();
      toast.success(res?.message || "Alerts marked as read");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update alerts");
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
          <h1 className="text-2xl font-bold text-gray-900">
            Monthly Subscriptions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage monthly subscription bookings
          </p>
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
          <div className="w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            {/* Time slot range filter */}
            <div
              className={`w-full sm:w-[180px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${slotFrom ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50"}`}
            >
              <Clock
                size={14}
                className={slotFrom ? "text-primary" : "text-gray-400"}
              />
              <select
                value={slotFrom}
                onChange={(e) => {
                  setSlotFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-sm outline-none text-gray-700 w-full min-w-0 cursor-pointer"
              >
                <option value="">Slot From</option>
                {timeSlots.map((s) => {
                  const value = formatTime12(s.slot_time);
                  return (
                    <option key={s.id} value={value}>
                      {s.display_label || value}
                    </option>
                  );
                })}
              </select>
            </div>
            <div
              className={`w-full sm:w-[180px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${slotTo ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50"}`}
            >
              <Clock
                size={14}
                className={slotTo ? "text-primary" : "text-gray-400"}
              />
              <select
                value={slotTo}
                onChange={(e) => {
                  setSlotTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-sm outline-none text-gray-700 w-full min-w-0 cursor-pointer"
              >
                <option value="">Slot To</option>
                {timeSlots.map((s) => {
                  const value = formatTime12(s.slot_time);
                  return (
                    <option key={s.id} value={value}>
                      {s.display_label || value}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Clear slot filter */}
            {(slotFrom || slotTo) && (
              <button
                onClick={() => {
                  setSlotFrom("");
                  setSlotTo("");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <X size={12} />
                Clear Slots
              </button>
            )}

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
        <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Coordinator
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Service Started At
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Service Ended At
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="py-8 text-center text-gray-500">
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {booking.id}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <ServiceNameDisplay name={booking.serviceType} />
                        </div>
                        {Array.isArray(booking.addons) &&
                          booking.addons.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
                                Add-ons
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {booking.addons.slice(0, 2).map((addon) => (
                                  <span
                                    key={addon.id}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100"
                                  >
                                    {addon.name} x{addon.quantity}
                                  </span>
                                ))}
                                {booking.addons.length > 2 && (
                                  <span className="text-[10px] text-purple-600 font-medium">
                                    +{booking.addons.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        {booking.category && (
                          <div className="mt-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeStyles(
                                booking.category,
                              )}`}
                            >
                              {booking.category}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5 mt-1">
                          {booking.serviceGroup && (
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
                              Group: {booking.serviceGroup}
                            </div>
                          )}
                          {booking.sizeType && (
                            <div className="text-[10px] text-gray-500">
                              Size: {booking.sizeValue} {booking.sizeType}
                            </div>
                          )}
                          {booking.subscriptionName && (
                            <div className="text-[10px] font-semibold text-blue-500">
                              {booking.subscriptionName}
                            </div>
                          )}
                        </div>
                        {booking.serviceType
                          .toLowerCase()
                          .includes("instant help") && (
                          <button
                            type="button"
                            onClick={() => handleViewExtensions(booking)}
                            className="mt-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                          >
                            View Extensions
                          </button>
                        )}
                        {booking.hasRescheduleHistory && (
                          <button
                            type="button"
                            onClick={() => handleViewRescheduleHistory(booking)}
                            className={`mt-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 block`}
                          >
                            Reschedule History
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                            {booking.customerName
                              ? booking.customerName.charAt(0)
                              : "?"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {booking.customerName}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {booking.customerId}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {booking.customerPhone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 min-w-[180px]">
                        <WorkerNamesDisplay
                          workers={booking.assignedWorkers}
                          fallbackName={booking.workerName}
                          fallbackId={booking.workerId}
                        />
                      </td>
                      <td className="py-4 px-6 min-w-[200px]">
                        <CoordinatorNamesDisplay
                          coordinators={booking.coordinators}
                        />
                      </td>
                      <td className="py-4 px-6 min-w-[200px]">
                        <div className="flex items-start gap-1.5 text-sm text-gray-900 max-w-[250px]">
                          <MapPin
                            size={14}
                            className="text-gray-400 mt-1 flex-shrink-0"
                          />
                          <LocationDisplay location={booking.location} />
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <Calendar size={14} className="text-gray-400" />
                            {booking.subscriptionStart &&
                            booking.subscriptionEnd
                              ? booking.subscriptionStart ===
                                booking.subscriptionEnd
                                ? booking.subscriptionStart
                                : `${booking.subscriptionStart} \u2192 ${booking.subscriptionEnd}`
                              : booking.date}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={14} className="text-gray-400" />
                            {booking.time}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {booking.serviceStartedAt !== "N/A" ? (
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} className="text-gray-400" />
                              <span>{booking.serviceStartedAt}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-900">
                          {booking.serviceEndedAt !== "N/A" ? (
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} className="text-gray-400" />
                              <span>{booking.serviceEndedAt}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(booking.payment_status)}`}
                        >
                          {booking.payment_status === "payment_pending"
                            ? "Payment Pending"
                            : booking.payment_status.charAt(0).toUpperCase() +
                              booking.payment_status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{Number(booking.amount || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.serviceType
                            .toLowerCase()
                            .includes("instant help") &&
                            instantBookingId === booking.originalId &&
                            instantBooking?.extension_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                                <Clock size={12} />
                                {instantBooking.extension_count} extensions
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            booking.source === "web"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : booking.source === "mobile"
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-blue-50 text-blue-700 border-blue-100" // Default to web styling
                          }`}
                        >
                          {booking.source
                            ? booking.source.charAt(0).toUpperCase() +
                              booking.source.slice(1)
                            : "Web"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleShowBookingDetails(booking)}
                            className="p-2 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                            title="Show Booking"
                            aria-label="Show Booking"
                          >
                            <Eye size={16} />
                          </button>
                          {booking.status === "Pending" && (
                            <button
                              onClick={() => handleAssignClick(booking)}
                              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              Assign
                            </button>
                          )}
                          <button
                            onClick={() =>
                              booking.coordinatorIds?.length > 0
                                ? handleReassignCoordinatorClick(booking)
                                : handleAssignCoordinatorClick(booking)
                            }
                            className="px-3 py-1.5 bg-white text-indigo-700 border border-indigo-200 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                          >
                            {booking.coordinatorIds?.length > 0
                              ? "Reassign Coordinator"
                              : "Assign Coordinator"}
                          </button>
                          {booking.workerId &&
                            booking.subscriptionName &&
                            booking.subscriptionName
                              .toLowerCase()
                              .includes("monthly") && (
                              <button
                                onClick={() => handleReassignClick(booking)}
                                className="px-3 py-1.5 bg-white text-primary border border-primary text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                              >
                                Reassign
                              </button>
                            )}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(
                                  activeMenuId === booking.id
                                    ? null
                                    : booking.id,
                                )
                              }
                              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeMenuId === booking.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleEditBooking(booking)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                  >
                                    <Edit size={14} />
                                    Edit Booking
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSendPaymentLink(booking)
                                    }
                                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                  >
                                    <CreditCard size={14} />
                                    Send Payment Link
                                  </button>
                                  {booking.serviceType
                                    .toLowerCase()
                                    .includes("instant help") && (
                                    <button
                                      onClick={() =>
                                        handleViewExtensions(booking)
                                      }
                                      className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                    >
                                      <Clock size={14} />
                                      View Extensions
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleSendBothOtp(booking)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                  >
                                    <Key size={14} />
                                    Send Both OTP
                                  </button>
                                  {booking.subscriptionName &&
                                    booking.subscriptionName
                                      .toLowerCase()
                                      .includes("monthly") && (
                                      <>
                                        {!["Cancelled", "Completed", "Paused"].includes(
                                          booking.status,
                                        ) && (
                                          <button
                                            onClick={() =>
                                              handlePauseBookingClick(booking)
                                            }
                                            className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                          >
                                            <PauseCircle size={14} />
                                            Pause Booking
                                          </button>
                                        )}
                                        <button
                                          onClick={() =>
                                            handleViewPauseHistory(booking)
                                          }
                                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                        >
                                          <History size={14} />
                                          Pause History
                                        </button>
                                      </>
                                    )}
                                  {/* <button
                                    onClick={() =>
                                      handleUpdateLocationSubmit(booking)
                                    }
                                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                  >
                                    <MapPin size={14} />
                                    Update Location
                                  </button> */}
                                  {booking.hasRescheduleHistory && (
                                    <button
                                      onClick={() =>
                                        handleViewRescheduleHistory(booking)
                                      }
                                      className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                    >
                                      <Clock size={14} />
                                      Reschedule History
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings List - Mobile View */}
      <div className="md:hidden space-y-4">
        {currentItems.map((booking) => (
          <div
            key={booking.id}
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4"
          >
            {/* Header: ID & Status */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-medium text-gray-900">
                  {booking.id}
                </span>
                <div className="text-xs text-gray-500 mt-0.5">
                  <ServiceNameDisplay name={booking.serviceType} />
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                  {booking.serviceGroup && (
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
                      {booking.serviceGroup}
                    </span>
                  )}
                  {booking.sizeType && (
                    <span className="text-[10px] text-gray-500">
                      {booking.sizeValue} {booking.sizeType}
                    </span>
                  )}
                  {booking.subscriptionName && (
                    <span className="text-[10px] font-semibold text-blue-500">
                      {booking.subscriptionName}
                    </span>
                  )}
                </div>
                {booking.serviceType.toLowerCase().includes("instant help") && (
                  <button
                    type="button"
                    onClick={() => handleViewExtensions(booking)}
                    className="mt-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    View Extensions
                  </button>
                )}
                {booking.hasRescheduleHistory && (
                  <button
                    type="button"
                    onClick={() => handleViewRescheduleHistory(booking)}
                    className="mt-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 block"
                  >
                    Reschedule History
                  </button>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}
              >
                {booking.status}
              </span>
            </div>

            {/* Customer & Worker */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
              <div>
                <p className="text-xs text-gray-500 mb-2">Customer</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {booking.customerName
                      ? booking.customerName.charAt(0)
                      : "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {booking.customerName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {booking.customerId}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {booking.customerPhone}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Worker</p>
                <WorkerNamesDisplay
                  workers={booking.assignedWorkers}
                  fallbackName={booking.workerName}
                  fallbackId={booking.workerId}
                />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-2">Coordinator</p>
                <CoordinatorNamesDisplay coordinators={booking.coordinators} />
              </div>
            </div>

            {/* Details: Date, Time, Location */}
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={14} className="text-gray-400" />
                {booking.subscriptionStart && booking.subscriptionEnd
                  ? booking.subscriptionStart === booking.subscriptionEnd
                    ? booking.subscriptionStart
                    : `${booking.subscriptionStart} \u2192 ${booking.subscriptionEnd}`
                  : booking.date}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={14} className="text-gray-400" />
                {booking.time}
              </div>
              {booking.serviceEndedAt !== "N/A" && (
                <div className="col-span-2 flex items-center gap-2 text-gray-600">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-tight">
                    Ended At:
                  </span>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock size={14} className="text-gray-400" />
                    {booking.serviceEndedAt}
                  </div>
                </div>
              )}
              <div className="col-span-2 flex items-start gap-2 text-gray-600">
                <MapPin
                  size={14}
                  className="text-gray-400 mt-1 flex-shrink-0"
                />
                <LocationDisplay location={booking.location} />
              </div>
            </div>

            {/* Footer: Amount & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-lg font-bold text-gray-900">
                  ₹{Number(booking.amount || 0).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShowBookingDetails(booking)}
                  className="p-2 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                  title="Show Booking"
                  aria-label="Show Booking"
                >
                  <Eye size={16} />
                </button>
                {booking.status === "Pending" && (
                  <button
                    onClick={() => handleAssignClick(booking)}
                    className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Assign
                  </button>
                )}
                <button
                  onClick={() =>
                    booking.coordinatorIds?.length > 0
                      ? handleReassignCoordinatorClick(booking)
                      : handleAssignCoordinatorClick(booking)
                  }
                  className="px-4 py-2 bg-white text-indigo-700 border border-indigo-200 text-xs font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  {booking.coordinatorIds?.length > 0
                    ? "Reassign Coordinator"
                    : "Assign Coordinator"}
                </button>
                {booking.workerId &&
                  booking.subscriptionName &&
                  booking.subscriptionName
                    .toLowerCase()
                    .includes("monthly") && (
                    <button
                      onClick={() => handleReassignClick(booking)}
                      className="px-4 py-2 bg-white text-primary border border-primary text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      Reassign
                    </button>
                  )}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveMenuId(
                        activeMenuId === booking.id ? null : booking.id,
                      )
                    }
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeMenuId === booking.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-100">
                      <div className="py-1">
                        <button
                          onClick={() => handleSendPaymentLink(booking)}
                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                        >
                          <CreditCard size={14} />
                          Send Payment Link
                        </button>
                        {booking.serviceType
                          .toLowerCase()
                          .includes("instant help") && (
                          <button
                            onClick={() => handleViewExtensions(booking)}
                            className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                          >
                            <Clock size={14} />
                            View Extensions
                          </button>
                        )}
                        <button
                          onClick={() => handleSendBothOtp(booking)}
                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                        >
                          <Key size={14} />
                          Send Both OTP
                        </button>
                        <button
                          onClick={() => handleUpdateLocationSubmit(booking)}
                          className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                        >
                          <MapPin size={14} />
                          Update Location
                        </button>
                        {booking.subscriptionName &&
                          booking.subscriptionName
                            .toLowerCase()
                            .includes("monthly") && (
                            <>
                              {!["Cancelled", "Completed", "Paused"].includes(
                                booking.status,
                              ) && (
                                <button
                                  onClick={() =>
                                    handlePauseBookingClick(booking)
                                  }
                                  className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                                >
                                  <PauseCircle size={14} />
                                  Pause Booking
                                </button>
                              )}
                              <button
                                onClick={() => handleViewPauseHistory(booking)}
                                className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                              >
                                <History size={14} />
                                Pause History
                              </button>
                            </>
                          )}
                        {booking.hasRescheduleHistory && (
                          <button
                            onClick={() => handleViewRescheduleHistory(booking)}
                            className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-gray-700 hover:bg-gray-100"
                          >
                            <Clock size={14} />
                            Reschedule History
                          </button>
                        )}
                        <div className="border-t border-gray-100 my-1"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filteredBookings.length > 0 && (
        <div className="bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            Showing{" "}
            <span className="font-medium">
              {Math.max(1, indexOfFirstItem + 1)}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(
                indexOfLastItem,
                isServerPaginated ? serverTotal : filteredBookings.length,
              )}
            </span>{" "}
            of{" "}
            <span className="font-medium">
              {isServerPaginated ? serverTotal : filteredBookings.length}
            </span>{" "}
            results
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {/* Page Numbers */}
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`px-3 py-1 text-xs font-medium rounded-md shadow-sm transition-colors ${
                  currentPage === i + 1
                    ? "text-white bg-primary"
                    : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() =>
                handlePageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Worker Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Worker"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Booking Details
            </h4>
            <div className="flex flex-wrap gap-4 text-sm text-blue-700">
              <span className="font-medium px-2 py-0.5 bg-blue-100 rounded-full text-xs">
                {selectedBooking?.serviceType}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={14} /> {selectedBooking?.customerName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {selectedBooking?.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {selectedBooking?.time}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Available Workers</h4>
              {selectedWorkerIds.length > 0 && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedWorkerIds.length} Selected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isReassignMode
                ? "Select workers to reassign this booking to"
                : "Select workers to assign to this booking"}
            </p>

            {/* Worker search */}
            <div className="relative mt-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                placeholder="Search workers by name or phone..."
                className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
              {workerSearch && (
                <button
                  type="button"
                  onClick={() => setWorkerSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full"
                  aria-label="Clear worker search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 mt-3 max-h-[400px] overflow-y-auto pr-1">
              {isLoadingWorkers || isFetchingUnassignedWorkers ? (
                <div className="text-center py-8 text-gray-500">
                  {debouncedWorkerSearch
                    ? `Searching workers for "${debouncedWorkerSearch}"...`
                    : "Loading available workers..."}
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {debouncedWorkerSearch ? (
                    <>
                      No workers found for{" "}
                      <span className="font-medium text-gray-900">
                        "{debouncedWorkerSearch}"
                      </span>
                      .
                    </>
                  ) : (
                    <>
                      No unassigned workers available for{" "}
                      <span className="font-medium text-gray-900">
                        {selectedBooking?.serviceType}
                      </span>
                      .
                    </>
                  )}
                </div>
              ) : (
                filteredWorkers.map((worker) => {
                  const isSelected = selectedWorkerIds.includes(worker.id);
                  const avatar =
                    worker.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      worker.name || "Worker",
                    )}&background=random&color=fff`;

                  return (
                    <div
                      key={worker.id}
                      onClick={() => toggleWorkerSelection(worker.id)}
                      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all group ${
                        isSelected
                          ? "border-primary bg-blue-50 ring-1 ring-primary/20"
                          : "border-gray-200 hover:border-primary hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={avatar}
                            alt={worker.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {worker.name}
                          </h5>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1 text-yellow-600 font-medium">
                              <Star size={12} fill="currentColor" />{" "}
                              {worker.rating || "New"}
                            </span>
                            <span>{worker.jobs_completed || 0} Jobs</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {worker.address || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="text-primary font-semibold text-xs">
                            Selected
                          </span>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-gray-300 group-hover:border-primary transition-colors" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAssignment}
              disabled={
                selectedWorkerIds.length === 0 || isAssigning || isReassigning
              }
              className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAssigning || isReassigning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {isReassignMode ? "Reassign" : "Assign"}{" "}
                  {selectedWorkerIds.length > 0 &&
                    `(${selectedWorkerIds.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Coordinator Assignment Modal */}
      <Modal
        isOpen={isCoordinatorModalOpen}
        onClose={() => setIsCoordinatorModalOpen(false)}
        title={
          isCoordinatorReassignMode
            ? "Reassign Coordinators"
            : "Assign Coordinator"
        }
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <h4 className="text-sm font-medium text-indigo-900 mb-1">
              Booking Details
            </h4>
            <div className="flex flex-wrap gap-3 text-sm text-indigo-700">
              <span className="font-medium">#{selectedBooking?.id}</span>
              <span>{selectedBooking?.customerName}</span>
              <span>{selectedBooking?.serviceType}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Available Coordinators
              </h4>
              {selectedCoordinatorIds.length > 0 && (
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selectedCoordinatorIds.length} Selected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isCoordinatorReassignMode
                ? "Select coordinators to reassign for this booking"
                : "Select coordinators to assign to this booking"}
            </p>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {allCoordinators.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No coordinators available.
                </div>
              ) : (
                allCoordinators.map((coordinator) => {
                  const isSelected = selectedCoordinatorIds.includes(
                    coordinator.id,
                  );
                  return (
                    <button
                      key={coordinator.id}
                      type="button"
                      onClick={() => toggleCoordinatorSelection(coordinator.id)}
                      className={`w-full flex items-center justify-between p-3 border rounded-xl transition-all ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/40"
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {coordinator.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {coordinator.phone || "N/A"}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-between bg-green-50/60 border border-green-100 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <MessageSquare size={14} />
              Send booking details on WhatsApp to selected coordinators
            </div>
            <button
              type="button"
              onClick={() =>
                setSendWhatsappAfterCoordinatorSave((prev) => !prev)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                sendWhatsappAfterCoordinatorSave
                  ? "bg-green-600"
                  : "bg-gray-300"
              }`}
              aria-pressed={sendWhatsappAfterCoordinatorSave}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  sendWhatsappAfterCoordinatorSave
                    ? "translate-x-5"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsCoordinatorModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCoordinatorAssignment}
              disabled={
                selectedCoordinatorIds.length === 0 ||
                isAssigningCoordinator ||
                isReassigningCoordinator
              }
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAssigningCoordinator || isReassigningCoordinator ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {isCoordinatorReassignMode ? "Reassign" : "Assign"}
                  {selectedCoordinatorIds.length > 0 &&
                    ` (${selectedCoordinatorIds.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule History Modal */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          setIsRescheduleModalOpen(false);
          setRescheduleBookingId(null);
        }}
        title="Reschedule History"
        size="lg"
      >
        {isLoadingReschedule ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading history...
          </div>
        ) : !rescheduleData ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No data available.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    Booking Details - BK-{rescheduleData.booking_id}
                  </p>
                  <p className="text-xs text-gray-500">
                    Current Date:{" "}
                    <span className="font-medium">
                      {rescheduleData.current_booking_date}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Current Slot:{" "}
                    <span className="font-medium">
                      {rescheduleData.current_time_slot}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Reschedule Count:{" "}
                    <span className="font-bold text-primary">
                      {rescheduleData.reschedule_count}
                    </span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Last: {rescheduleData.last_rescheduled_at}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                History Logs
              </h4>
              {Array.isArray(rescheduleData.history) &&
              rescheduleData.history.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {rescheduleData.history.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border border-gray-100 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">
                            Old Schedule
                          </p>
                          <p className="font-medium text-gray-700">
                            {log.old_date}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.old_time_slot}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold text-right">
                            New Schedule
                          </p>
                          <p className="font-medium text-gray-700 text-right">
                            {log.new_date}
                          </p>
                          <p className="text-xs text-gray-500 text-right">
                            {log.new_time_slot}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-50">
                        <p className="text-xs italic text-gray-600">
                          <span className="font-medium not-italic">
                            Reason:
                          </span>{" "}
                          {log.reason || "N/A"}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 text-right">
                          Requested at: {log.created_at}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No reschedule history logs found.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Instant Booking Extensions Modal */}
      <Modal
        isOpen={isExtensionsModalOpen}
        onClose={() => {
          setIsExtensionsModalOpen(false);
          setInstantBookingId(null);
        }}
        title="Instant Help Extensions"
        size="lg"
      >
        {isLoadingExtensions ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading extensions...
          </div>
        ) : !instantBooking ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No data available.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {instantBooking.service?.name ||
                      "Instant Help - Booking Details"}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    NSK-{instantBooking.id}
                  </p>
                </div>
                <div className="space-y-1 text-xs">
                  <p>
                    Customer:{" "}
                    <span className="font-medium">
                      {instantBooking.customer?.name} (
                      {instantBooking.customer?.phone})
                    </span>
                  </p>
                  <p>
                    Worker:{" "}
                    <span className="font-medium">
                      {instantBooking.worker?.name || "Unassigned"}
                    </span>
                  </p>
                  <p>
                    Base Amount:{" "}
                    <span className="font-medium">
                      ₹{Number(instantBooking.amount || 0).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Extensions ({instantBooking.extension_count || 0})
              </h4>
              {Array.isArray(instantBooking.extensions) &&
              instantBooking.extensions.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {instantBooking.extensions.map((ext) => (
                    <div
                      key={ext.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-white"
                    >
                      <div className="space-y-1 text-sm text-gray-700">
                        <p className="font-medium">
                          Extension #{ext.id} - {ext.duration_minutes} min
                        </p>
                        <p className="text-xs text-gray-500">
                          Created at:{" "}
                          {ext.created_at
                            ? format(
                                new Date(ext.created_at),
                                "yyyy-MM-dd HH:mm",
                              )
                            : "N/A"}
                        </p>
                        {ext.paid_at && (
                          <p className="text-xs text-gray-500">
                            Paid at:{" "}
                            {format(new Date(ext.paid_at), "yyyy-MM-dd HH:mm")}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-gray-900">
                          ₹{Number(ext.amount || 0).toFixed(2)}
                        </p>
                        <p
                          className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            ext.payment_status === "paid"
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-yellow-50 text-yellow-700 border-yellow-100"
                          }`}
                        >
                          {ext.payment_status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No extensions found for this booking.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isBookingDetailsModalOpen}
        onClose={() => setIsBookingDetailsModalOpen(false)}
        title="Booking Details"
        size="lg"
      >
        {!selectedBooking ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No booking selected.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                {selectedBooking.id}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedBooking.status)}`}
              >
                {selectedBooking.status}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(selectedBooking.payment_status)}`}
              >
                {selectedBooking.payment_status === "payment_pending"
                  ? "Payment Pending"
                  : selectedBooking.payment_status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Customer
                </p>
                <p className="font-medium text-gray-900">
                  {selectedBooking.customerName}
                </p>
                <p className="text-gray-600 font-mono">
                  {selectedBooking.customerId}
                </p>
                <p className="text-gray-600 font-mono">
                  {selectedBooking.customerPhone}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Service
                </p>
                <p className="font-medium text-gray-900">
                  {selectedBooking.serviceType}
                </p>
                <p className="text-gray-600">
                  {selectedBooking.subscriptionName || "N/A"}
                </p>
                <p className="text-gray-600">
                  Source: {selectedBooking.source || "web"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border border-gray-100">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Schedule
                </p>
                <p className="text-gray-800">Date: {selectedBooking.date}</p>
                <p className="text-gray-800">
                  Time Slot: {selectedBooking.time}
                </p>
                <p className="text-gray-800">
                  Start:{" "}
                  {selectedBooking.subscriptionStart || selectedBooking.date}
                </p>
                <p className="text-gray-800">
                  End: {selectedBooking.subscriptionEnd || selectedBooking.date}
                </p>
                <p className="text-gray-800">
                  Service Started At:{" "}
                  {selectedBooking.serviceStartedAt || "N/A"}
                </p>
                <p className="text-gray-800">
                  Service Ended At: {selectedBooking.serviceEndedAt || "N/A"}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-gray-100">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Amount
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  ₹{Number(selectedBooking.amount || 0).toFixed(2)}
                </p>
                <p className="text-gray-600 mt-2">
                  Worker: {selectedBooking.workerName || "Unassigned"}
                </p>
                <p className="text-gray-600">
                  Coordinators:{" "}
                  {selectedBooking.coordinators?.length
                    ? selectedBooking.coordinators.map((c) => c.name).join(", ")
                    : "Not assigned"}
                </p>
                {(selectedBooking.platformFee != null ||
                  selectedBooking.travellingCharge != null ||
                  selectedBooking.taxAmount != null ||
                  selectedBooking.rainCharge != null) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-1">
                      Fee Breakdown
                    </p>
                    {selectedBooking.platformFee != null && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Platform Fee</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.platformFee).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.travellingCharge != null && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Travelling Charge</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.travellingCharge).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.rainCharge != null && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Rain Charge</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.rainCharge).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedBooking.taxAmount != null && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Tax</span>
                        <span className="font-medium">
                          ₹{Number(selectedBooking.taxAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Address
              </p>
              <p className="text-sm text-gray-800 break-words">
                {selectedBooking.location || "N/A"}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Export Options Modal (Monthly Subscriptions only) */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={`Export Monthly Subscriptions as ${
          exportOptions.format === "excel" ? "Excel" : "PDF"
        }`}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExportReport();
          }}
          className="space-y-5"
        >
          {/* Locked subscription notice */}
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
            <div className="text-xs text-blue-900">
              Subscription Type: <span className="font-semibold">Monthly</span>{" "}
              <span className="text-blue-700/70">(locked for this page)</span>
            </div>
          </div>

          {/* Format toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Format
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {["pdf", "excel"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setExportOptions((prev) => ({ ...prev, format: f }))
                  }
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    exportOptions.format === f
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {f === "pdf" ? "PDF" : "Excel"}
                </button>
              ))}
            </div>
          </div>

          {/* Status + Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Status
              </label>
              <select
                value={exportOptions.status}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Payment Status
              </label>
              <select
                value={exportOptions.payment_status}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    payment_status: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              >
                <option value="">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Category
            </label>
            <select
              value={exportOptions.category_id}
              onChange={(e) =>
                setExportOptions((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            >
              <option value="">All Categories</option>
              {serviceCategories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Today toggle */}
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-blue-900">
              <Calendar size={14} />
              Only today's bookings
              <span className="text-xs text-blue-700/70">
                (ignored if a date range is set)
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setExportOptions((prev) => ({ ...prev, today: !prev.today }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                exportOptions.today ? "bg-primary" : "bg-gray-300"
              }`}
              aria-pressed={exportOptions.today}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  exportOptions.today ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                From Date
              </label>
              <input
                type="date"
                value={exportOptions.from_date}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    from_date: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                To Date
              </label>
              <input
                type="date"
                value={exportOptions.to_date}
                min={exportOptions.from_date || undefined}
                onChange={(e) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    to_date: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Time slot range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Slot From
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
                <Clock size={14} className="text-gray-400" />
                <select
                  value={exportOptions.slot_from}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      slot_from: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">Any</option>
                  {timeSlots.map((s) => {
                    const value = formatTime12(s.slot_time);
                    return (
                      <option key={s.id} value={value}>
                        {s.display_label || value}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Slot To
              </label>
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all">
                <Clock size={14} className="text-gray-400" />
                <select
                  value={exportOptions.slot_to}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      slot_to: e.target.value,
                    }))
                  }
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">Any</option>
                  {timeSlots.map((s) => {
                    const value = formatTime12(s.slot_time);
                    return (
                      <option key={s.id} value={value}>
                        {s.display_label || value}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() =>
                setExportOptions((prev) => ({
                  format: prev.format,
                  status: "",
                  payment_status: "",
                  subscription_type_id: prev.subscription_type_id,
                  category_id: "",
                  from_date: "",
                  to_date: "",
                  slot_from: "",
                  slot_to: "",
                  today: false,
                }))
              }
              className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Reset filters
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExportingReport}
                className="px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExportingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download{" "}
                    {exportOptions.format === "excel" ? "Excel" : "PDF"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Booking"
        size="lg"
      >
        {editBooking &&
          (() => {
            const currentTimeSlot =
              editBooking.time_slot || editBooking.time || "";

            // Generate 15-min intervals from 9 AM to 6 PM
            const baseTimeSlots = [];
            let current = new Date();
            current.setHours(9, 0, 0, 0);
            const endTime = new Date();
            endTime.setHours(18, 0, 0, 0);

            while (current <= endTime) {
              baseTimeSlots.push(format(current, "hh:mm a"));
              current = new Date(current.getTime() + 15 * 60000);
            }

            const timeSlotOptions =
              currentTimeSlot && !baseTimeSlots.includes(currentTimeSlot)
                ? [currentTimeSlot, ...baseTimeSlots]
                : baseTimeSlots;

            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const startDate = formData.get("start_date");
                  const endDate = formData.get("end_date");
                  const singleDate = formData.get("booking_date");
                  const bookingData = {
                    booking_date: singleDate || startDate || editBooking.date,
                    start_date: startDate || singleDate || undefined,
                    end_date: endDate || singleDate || undefined,
                    time_slot: formData.get("time_slot"),
                    status: formData.get("status"),
                    payment_status: formData.get("payment_status"),
                  };
                  handleUpdateBooking(bookingData);
                }}
                className="space-y-6"
              >
                {/* Booking Date / Subscription Dates */}
                {editBooking.subscriptionStart &&
                editBooking.subscriptionEnd &&
                editBooking.subscriptionStart !==
                  editBooking.subscriptionEnd ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="start_date"
                        defaultValue={toInputDate(
                          editBooking.subscriptionStart,
                        )}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="end_date"
                        defaultValue={toInputDate(editBooking.subscriptionEnd)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking Date
                    </label>
                    <input
                      type="date"
                      name="booking_date"
                      defaultValue={toInputDate(
                        editBooking.booking_date ||
                          editBooking.subscriptionStart ||
                          editBooking.date,
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                )}

                {/* Time Slot */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Slot
                  </label>
                  <select
                    name="time_slot"
                    defaultValue={currentTimeSlot}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">Select Time Slot</option>
                    {timeSlotOptions.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editBooking.status?.toLowerCase()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="pending">Pending</option>

                    <option value="cancelled">Cancelled</option>
                    <option value="assigned">Assigned</option>
                    <option value="inprogress">In Progress</option>
                    {/* <option value="reassigned">Reassigned</option> */}
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    name="payment_status"
                    defaultValue={editBooking.payment_status?.toLowerCase()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="payment_pending">Payment Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? "Updating..." : "Update Booking"}
                  </button>
                </div>
              </form>
            );
          })()}
      </Modal>

      {/* Location Update Modal removed */}

      {/* Pause Booking Modal */}
      <PauseBookingModal
        isPauseModalOpen={isPauseModalOpen}
        setIsPauseModalOpen={setIsPauseModalOpen}
        pauseBooking={pauseBooking}
        isPausing={isPausing}
        handlePauseBooking={handlePauseBooking}
      />

      {/* Pause History Modal */}
      <PauseHistoryModal
        isPauseHistoryModalOpen={isPauseHistoryModalOpen}
        setIsPauseHistoryModalOpen={setIsPauseHistoryModalOpen}
        setPauseHistoryBookingId={setPauseHistoryBookingId}
        pauseHistoryData={pauseHistoryData}
        isLoadingPauseHistory={isLoadingPauseHistory}
      />
    </div>
  );
};

export default MonthlySubscriptions;
