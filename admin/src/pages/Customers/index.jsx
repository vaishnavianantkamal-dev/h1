import React, { useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import StatsGrid from "../../components/StatsGrid";
import FilterBar from "../../components/FilterBar";
import CityFilter from "../../components/CityFilter";
import CustomersTable from "./components/CustomersTable";
import BookingHistoryModal from "./components/BookingHistoryModal";
import { useGetCustomersQuery } from "../../api/apiSlice";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { format } from "date-fns";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [cityId, setCityId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 20;

  // Debounce the search input → server query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, cityId]);

  // Map the FilterBar tab → server's payment_status param. "All" means no filter.
  const paymentStatusParam = (() => {
    if (statusFilter === "Paid") return "paid";
    if (statusFilter === "Unpaid") return "unpaid";
    if (statusFilter === "Pending") return "payment_pending";
    if (statusFilter === "Rejected") return "rejected";
    return undefined;
  })();

  const { data: customersResponse, isLoading } = useGetCustomersQuery({
    page: currentPage,
    per_page: customersPerPage,
    search: debouncedSearchTerm || undefined,
    payment_status: paymentStatusParam,
    city_id: cityId || undefined,
  });

  const apiCustomers = customersResponse?.data || [];
  const apiStats = customersResponse?.stats || null;
  const apiMeta = customersResponse?.meta || null;

  // Normalize each customer (from /api/admin/customers) into the shape CustomersTable consumes
  const customersData = useMemo(() => {
    return apiCustomers.map((c) => {
      const bookings = Array.isArray(c.bookings) ? c.bookings : [];

      // Find the most recent booking by booking_date (descending), used for
      // both the "Last:" date column and the modal header payment status.
      const sortedBookingsDesc = [...bookings].sort(
        (a, b) =>
          new Date(b.booking_date || 0) - new Date(a.booking_date || 0),
      );
      const lastBooking = sortedBookingsDesc[0] || null;
      const lastBookingDate = lastBooking?.booking_date || "N/A";
      const lastBookingPaymentStatus = (
        lastBooking?.payment_status || ""
      ).toLowerCase();

      // Aggregate payment status — any unpaid booking shows the customer as unpaid
      const unpaidCount = Number(c.unpaid_bookings) || 0;
      const paymentStatus = unpaidCount > 0 ? "unpaid" : "paid";

      // Take address from the latest booking if available (fallback)
      const latestBookingWithAddress = [...bookings]
        .sort(
          (a, b) =>
            new Date(b.booking_date || 0) - new Date(a.booking_date || 0),
        )
        .find((b) => b.address || b.location);
      const address =
        latestBookingWithAddress?.address ||
        latestBookingWithAddress?.location ||
        "";

      // Normalize bookings for the history modal (it expects workerName + serviceName)
      // API ships time_slot and amount per booking; total_amount is currently null
      const normalizedBookings = bookings.map((b) => ({
        ...b,
        workerName: b.worker?.name || null,
        serviceName:
          b.services?.map((s) => s.service_name).filter(Boolean).join(", ") ||
          "Service",
        amount: b.amount ?? b.total_amount ?? "0",
        time_slot: b.time_slot || "",
      }));

      return {
        id: `C-${c.id}`,
        originalId: c.id,
        name: c.name || "Unknown",
        phone: c.phone || "N/A",
        email: c.email || null,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          c.name || "Customer",
        )}&background=random`,
        address,
        isWhatsapp: false,
        bookingsCount: Number(c.total_bookings) || bookings.length,
        completedBookings: Number(c.completed_bookings) || 0,
        lastBookingDate,
        paymentStatus,
        payment_status: paymentStatus,
        lastBookingPaymentStatus,
        rating: c.avg_rating != null ? Number(c.avg_rating).toFixed(1) : "N/A",
        feedback:
          c.total_ratings > 0
            ? `${c.total_ratings} review${c.total_ratings > 1 ? "s" : ""}`
            : "No feedback",
        bookings: normalizedBookings,
      };
    });
  }, [apiCustomers]);

  // Server already filtered by payment_status — no client-side filter needed
  const filteredCustomers = customersData;

  // Server pagination — meta carries the totals
  const totalCustomers = apiMeta?.total ?? filteredCustomers.length;
  const totalPages = apiMeta?.last_page ?? 1;
  const startIndex = (currentPage - 1) * customersPerPage;
  const endIndex = startIndex + customersPerPage;

  const handleViewHistory = (customer) => {
    setSelectedCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleExportList = () => {
    if (!filteredCustomers || filteredCustomers.length === 0) return;

    const exportData = filteredCustomers.map((customer) => ({
      "Customer ID": customer.id,
      Name: customer.name,
      Phone: customer.phone,
      Email: customer.email || "",
      Address: customer.address,
      "Total Bookings": customer.bookingsCount,
      "Last Booking Date": customer.lastBookingDate,
      "Payment Status": customer.paymentStatus || "N/A",
      "Avg Rating": customer.rating,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(
      data,
      `customers_list_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`,
    );
  };

  // All four cards now come straight from the API stats block
  const statsData = [
    {
      label: "Total Customers",
      value: apiStats?.total_customers ?? totalCustomers,
      colorClass: "text-gray-900",
    },
    {
      label: "Active Bookings",
      value: apiStats?.active_bookings ?? 0,
      colorClass: "text-blue-600",
    },
    {
      label: "Pending Payments",
      value: apiStats?.pending_payments ?? 0,
      colorClass: "text-red-600",
    },
    {
      label: "Avg Rating",
      value: apiStats?.avg_rating ?? "N/A",
      colorClass: "text-yellow-600",
    },
  ];

  const filterTabs = [
    { id: "All", label: "All" },
    { id: "Paid", label: "Paid" },
    { id: "Unpaid", label: "Unpaid" },
    { id: "Pending", label: "Pending" },
    { id: "Rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customers, history & feedback
          </p>
        </div>
        <button
          onClick={handleExportList}
          className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Download size={20} />
          <span className="font-medium">Export List</span>
        </button>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={statsData} />

      {/* Filters & Search */}
      <FilterBar
        tabs={filterTabs}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search name, phone..."
        onFilterClick={() => {}}
        rightSlot={<CityFilter value={cityId} onChange={setCityId} />}
      />

      {/* Customers Table */}
      <CustomersTable
        customers={filteredCustomers}
        totalCustomers={totalCustomers}
        currentPage={currentPage}
        totalPages={totalPages}
        customersPerPage={customersPerPage}
        startIndex={startIndex + 1}
        endIndex={Math.min(endIndex, totalCustomers)}
        onViewHistory={handleViewHistory}
        isLoading={isLoading}
        onPageChange={setCurrentPage}
      />

      {/* Booking History Modal */}
      <BookingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={closeHistoryModal}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default Customers;
