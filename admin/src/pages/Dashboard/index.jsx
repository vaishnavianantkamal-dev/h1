import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Briefcase,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  useGetOverviewQuery,
  useGetAllBookingsQuery,
  useGetWorkersQuery,
  useGetTransactionsQuery,
} from "../../api/apiSlice";
import CityFilter from "../../components/CityFilter";
import { format, isValid, parse } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const StatCard = ({ title, value, change, isPositive, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <button className="text-gray-400 hover:text-gray-600">
        <MoreHorizontal size={20} />
      </button>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">{value}</h3>
      <div className="flex items-center gap-2">
        <span
          className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
        >
          {isPositive ? (
            <ArrowUpRight size={14} className="mr-1" />
          ) : (
            <ArrowDownRight size={14} className="mr-1" />
          )}
          {change}
        </span>
        <span className="text-xs text-gray-400">vs last month</span>
      </div>
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="p-6 space-y-6 animate-pulse">
    <div className="flex justify-between items-center mb-8">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-200 rounded"></div>
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-40 bg-gray-200 rounded-lg"></div>
      </div>
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
            <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
          </div>
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Charts Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-[300px] w-full bg-gray-200 rounded-xl"></div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
          <div className="h-5 w-5 bg-gray-200 rounded"></div>
        </div>
        <div className="h-[300px] w-full bg-gray-200 rounded-xl"></div>
      </div>
    </div>

    {/* Recent Activity Skeleton */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <div className="h-6 w-48 bg-gray-200 rounded"></div>
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
      </div>
      <div className="p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0"
          >
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const queryOptions = { refetchOnMountOrArgChange: true };

const parseFlexibleDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // API transaction dates arrive as dd-MM-yyyy HH:mm:ss. Parse this first to
  // avoid browser-native Date treating values like 12-04-2026 as MM-dd-yyyy.
  if (/^\d{2}-\d{2}-\d{4}( \d{2}:\d{2}:\d{2})?$/.test(trimmed)) {
    const formatToUse = trimmed.includes(" ")
      ? "dd-MM-yyyy HH:mm:ss"
      : "dd-MM-yyyy";
    const parsed = parse(trimmed, formatToUse, new Date());
    if (isValid(parsed)) return parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(trimmed)) {
    const formatToUse = trimmed.includes(" ")
      ? "yyyy-MM-dd HH:mm:ss"
      : "yyyy-MM-dd";
    const parsed = parse(trimmed, formatToUse, new Date());
    if (isValid(parsed)) return parsed;
  }

  const nativeParsed = new Date(trimmed);
  if (isValid(nativeParsed)) return nativeParsed;

  const supportedFormats = [
    "dd-MM-yyyy HH:mm:ss",
    "dd-MM-yyyy",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd",
  ];

  for (const dateFormat of supportedFormats) {
    const parsed = parse(trimmed, dateFormat, new Date());
    if (isValid(parsed)) return parsed;
  }

  return null;
};

const formatSafeDate = (value, pattern, fallback = "N/A") => {
  const parsed = parseFlexibleDate(value);
  return parsed ? format(parsed, pattern) : fallback;
};

const getSafeTimestamp = (value) => {
  const parsed = parseFlexibleDate(value);
  return parsed ? parsed.getTime() : 0;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState("month");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [cityId, setCityId] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("transactions");
  const isCustomDateActive = Boolean(fromDate || toDate);
  const normalizedFromDate = fromDate || toDate || "";
  const normalizedToDate =
    fromDate && toDate
      ? new Date(fromDate) <= new Date(toDate)
        ? toDate
        : fromDate
      : "";
  const effectiveFromDate =
    fromDate && toDate
      ? new Date(fromDate) <= new Date(toDate)
        ? fromDate
        : toDate
      : normalizedFromDate;

  const overviewQueryParams = {
    ...(isCustomDateActive
      ? {
          ...(effectiveFromDate ? { from_date: effectiveFromDate } : {}),
          ...(normalizedToDate ? { to_date: normalizedToDate } : {}),
        }
      : { filter }),
    ...(cityId ? { city_id: cityId } : {}),
  };

  const { data: overviewData, isLoading } = useGetOverviewQuery(
    overviewQueryParams,
    queryOptions,
  );

  const { data: bookingsResponse } = useGetAllBookingsQuery();
  const bookingsData = Array.isArray(bookingsResponse)
    ? bookingsResponse
    : bookingsResponse?.data || [];
  const { data: workersData } = useGetWorkersQuery();
  const { data: transactionsResponse } = useGetTransactionsQuery();
  const transactionsData = transactionsResponse?.data || [];

  const handleDownloadReport = () => {
    const workbook = XLSX.utils.book_new();

    // 1. Overview Sheet
    if (overviewData?.cards) {
      const overviewSheetData = [
        ["Metric", "Total", "Percentage Change", "Trend"],
        [
          "Total Users",
          overviewData.cards.users?.total,
          overviewData.cards.users?.percentage,
          overviewData.cards.users?.trend,
        ],
        [
          "Total Bookings",
          overviewData.cards.bookings?.total,
          overviewData.cards.bookings?.percentage,
          overviewData.cards.bookings?.trend,
        ],
        [
          "Total Revenue",
          overviewData.cards.revenue?.total,
          overviewData.cards.revenue?.percentage,
          overviewData.cards.revenue?.trend,
        ],
        [
          "Growth Rate",
          overviewData.cards.growth?.total ?? overviewData.cards.groth?.total,
          overviewData.cards.growth?.percentage ??
            overviewData.cards.groth?.percentage,
          overviewData.cards.growth?.trend ?? overviewData.cards.groth?.trend,
        ],
      ];
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewSheetData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");
    }

    // 2. Transactions Sheet
    if (transactionsData && transactionsData.length > 0) {
      const transactionSheetData = transactionsData.map((t) => ({
        "Transaction ID": t.payment_id,
        Customer: t.user_name,
        Amount: t.amount,
        Status: t.status,
        Date: formatSafeDate(t.paid_at, "yyyy-MM-dd HH:mm:ss"),
      }));
      const transactionSheet = XLSX.utils.json_to_sheet(transactionSheetData);
      XLSX.utils.book_append_sheet(workbook, transactionSheet, "Transactions");
    }

    // 3. Bookings Sheet
    if (bookingsData && bookingsData.length > 0) {
      const bookingSheetData = bookingsData.map((b) => ({
        "Booking ID": b.id,
        Customer: b.customer_name,
        Service: b.service?.name,
        Status: b.status,
        Date: formatSafeDate(b.created_at, "yyyy-MM-dd HH:mm:ss"),
      }));
      const bookingSheet = XLSX.utils.json_to_sheet(bookingSheetData);
      XLSX.utils.book_append_sheet(workbook, bookingSheet, "Bookings");
    }

    // Generate Buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(
      data,
      `dashboard_report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`,
    );
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const cards = overviewData?.cards || {};
  const growthCard = cards.growth || cards.groth || {};
  const revenueChartData =
    overviewData?.revenue_chart?.map((item) => ({
      name: formatSafeDate(item.date, "MMM dd", "--"),
      revenue: parseFloat(item.total),
    })) || [];

  // booking_chart can arrive either as a flat array (legacy) or as an object
  // with all/completed/cancelled series (current API). Normalize to series and
  // merge them by date so the bar chart can show every category together.
  const rawBookingChart = overviewData?.booking_chart;
  const bookingSeries = Array.isArray(rawBookingChart)
    ? { all: rawBookingChart, completed: [], cancelled: [] }
    : {
        all: rawBookingChart?.all || [],
        completed: rawBookingChart?.completed || [],
        cancelled: rawBookingChart?.cancelled || [],
      };

  const bookingByDate = new Map();
  const mergeBookingSeries = (items, key) => {
    (items || []).forEach((item) => {
      if (!bookingByDate.has(item.date)) {
        bookingByDate.set(item.date, {
          date: item.date,
          name: formatSafeDate(item.date, "MMM dd", "--"),
          bookings: 0,
          completed: 0,
          cancelled: 0,
        });
      }
      bookingByDate.get(item.date)[key] = parseInt(item.total) || 0;
    });
  };
  mergeBookingSeries(bookingSeries.all, "bookings");
  mergeBookingSeries(bookingSeries.completed, "completed");
  mergeBookingSeries(bookingSeries.cancelled, "cancelled");

  const bookingChartData = Array.from(bookingByDate.values()).sort(
    (a, b) => getSafeTimestamp(a.date) - getSafeTimestamp(b.date),
  );

  // Process Recent Data
  const recentBookings = [...(bookingsData || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const recentWorkers = [...(workersData || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Process Recent Transactions
  const recentTransactions = [...(transactionsData || [])]
    .sort((a, b) => getSafeTimestamp(b.paid_at) - getSafeTimestamp(a.paid_at))
    .slice(0, 5)
    .map((t) => ({
      id: t.payment_id,
      customer: t.user_name || "Unknown",
      // Keep transaction date aligned with API style (dd-mm-yyyy hh:mm:ss).
      date: t.paid_at
        ? formatSafeDate(t.paid_at, "dd-MM-yyyy HH:mm:ss", t.paid_at)
        : "N/A",
      amount: `₹${parseFloat(t.amount).toLocaleString()}`,
      status: t.status,
      avatar: (t.user_name || "U").charAt(0).toUpperCase(),
    }));

  const getStatusColor = (status) => {
    switch (status) {
      case "captured":
      case "Success":
        return "bg-green-100 text-green-800";
      case "refunded":
      case "Refunded":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
      case "Failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              City
            </span>
            <CityFilter
              value={cityId}
              onChange={setCityId}
              className="bg-white border border-primary/20 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary block px-3 py-2 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Quick Filter
            </span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={isCustomDateActive}
              className={`bg-white border text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary block px-3 py-2 outline-none ${isCustomDateActive
                  ? "border-gray-200 opacity-60 cursor-not-allowed"
                  : "border-primary/20"
                }`}
            >
              <option value="day">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Custom Range
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary block px-3 py-2 outline-none"
              title="From date"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-primary focus:border-primary block px-3 py-2 outline-none"
              title="To date"
            />
          </div>

          {isCustomDateActive && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium rounded-lg text-sm px-4 py-2.5 transition-colors"
            >
              Clear Dates
            </button>
          )}
          <button
            onClick={handleDownloadReport}
            className="bg-primary hover:bg-blue-600 text-white font-medium rounded-lg text-sm px-5 py-2.5 transition-colors shadow-lg shadow-blue-500/30"
          >
            Download Report
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 -mt-4 mb-2">
        <span className="text-xs font-medium text-gray-500">Applied Filter:</span>
        {isCustomDateActive ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {normalizedToDate
              ? `${effectiveFromDate} to ${normalizedToDate}`
              : effectiveFromDate}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            {filter === "day"
              ? "Today"
              : filter === "week"
                ? "Last 7 Days"
                : filter === "year"
                  ? "This Year"
                  : "Last 30 Days"}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={cards.users?.total || 0}
          change={`${cards.users?.percentage || 0}%`}
          isPositive={cards.users?.trend === "up"}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Bookings"
          value={cards.bookings?.total || 0}
          change={`${cards.bookings?.percentage || 0}%`}
          isPositive={cards.bookings?.trend === "up"}
          icon={Briefcase}
          color="bg-primary"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${cards.revenue?.total || 0}`}
          change={`${cards.revenue?.percentage || 0}%`}
          isPositive={cards.revenue?.trend === "up"}
          icon={Wallet}
          color="bg-purple-500"
        />
        <StatCard
          title="Growth Rate"
          value={`${growthCard?.total || 0}%`}
          change={`${growthCard?.percentage || 0}%`}
          isPositive={growthCard?.trend === "up"}
          icon={TrendingUp}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">
              Revenue Analytics
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={revenueChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5070fe" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#5070fe" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  dy={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                />
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  itemStyle={{ color: "#5070fe" }}
                  formatter={(value) => [`₹${value}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#5070fe"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  dot={{
                    r: 6,
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: "#5070fe",
                  }}
                  activeDot={{
                    r: 8,
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: "#5070fe",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Booking Stats</h3>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingChartData}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  dy={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  cursor={{ fill: "transparent" }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar
                  dataKey="bookings"
                  name="All"
                  fill="#ffe75a"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="#34d399"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="cancelled"
                  name="Cancelled"
                  fill="#f87171"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Section with Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-4 border-b border-gray-200 w-full sm:w-auto">
            {["transactions", "bookings", "workers"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 text-sm font-medium transition-colors relative capitalize ${activeTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Recent {tab}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const paths = {
                transactions: "/transactions",
                bookings: "/orders-booking",
                workers: "/workers",
              };
              navigate(paths[activeTab]);
            }}
            className="text-primary text-sm font-medium hover:underline"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {activeTab === "transactions" && (
              <>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentTransactions.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        #{item.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {item.avatar}
                          </div>
                          <span className="text-sm text-gray-900 font-medium">
                            {item.customer}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                        {item.amount}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {activeTab === "bookings" && (
              <>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentBookings.length > 0 ? (
                    recentBookings.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                          #{item.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 uppercase">
                              {item.customer_name?.charAt(0) || "C"}
                            </div>
                            <span className="text-sm text-gray-900 font-medium">
                              {item.customer_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatSafeDate(item.created_at, "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {item.service?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${item.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : item.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No recent bookings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}

            {activeTab === "workers" && (
              <>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Worker Name
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined Date
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Services
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentWorkers.length > 0 ? (
                    recentWorkers.map((item) => {
                      const kycStatus =
                        item.kyc_status ||
                        item.worker?.kyc_status ||
                        item.kycStatus ||
                        "Pending";
                      const isVerified =
                        kycStatus.toLowerCase() === "verified" ||
                        kycStatus.toLowerCase() === "approved";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 uppercase">
                                {item.name?.charAt(0) || "W"}
                              </div>
                              <span className="text-sm text-gray-900 font-medium">
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {item.phone}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {(() => {
                              const dateStr =
                                item.created_at ||
                                item.worker?.created_at ||
                                item.worker_availablillity?.[0]?.created_at;
                              return formatSafeDate(dateStr, "yyyy-MM-dd");
                            })()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {item.services?.length || (item.service ? 1 : 0)}{" "}
                            Services
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${isVerified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                                }`}
                            >
                              {kycStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No recent workers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
