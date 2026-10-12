import React, { useState, useEffect } from "react";
import {
  Download,
  Trash2,
  Search,
  Eye,
  MapPin,
  Calendar,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  FileText,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";
import TableSkeleton from "../../components/TableSkeleton";
import {
  useGetResidentSurveysQuery,
  useGetMaidSurveysQuery,
} from "../../api/apiSlice";

const SurveyList = () => {
  const [activeTab, setActiveTab] = useState("resident");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // Fetch Resident Surveys
  const {
    data: residentData,
    isLoading: isResidentLoading,
    error: residentError,
  } = useGetResidentSurveysQuery({ page });

  // Fetch Maid Surveys
  const {
    data: maidData,
    isLoading: isMaidLoading,
    error: maidError,
  } = useGetMaidSurveysQuery({ page });

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const residentSubmissions =
    (Array.isArray(residentData?.data?.data) ? residentData.data.data : []).map(
      (item) => ({
        id: item.id,
        type: "resident",
        submittedAt: item.created_at,
        surveyorName: item.surveyor_name,
        buildingName: item.building_name,
        flatNumber: item.flat_number,
        residentName: item.resident_name,
        membersCount: item.family_members,
        maidsCount: item.maids_count,
        workTypes: item.work_types,
        workDuration: item.work_duration,
        reliabilityRating: item.reliability_rating,
        problems: item.problems_faced,
        timeSlots: item.preferred_time_slots,
        monthlyPayment: item.monthly_payment_range,
        findingMethod: item.maid_source,
        appOpenness: item.app_openness,
        convincingFactors: item.convincing_factors,
        extraPayment: item.extra_payment,
        joinWhatsapp: item.whatsapp_group_interest,
        whatsappNumber: item.whatsapp_number,
      }),
    ) || [];

  const maidSubmissions =
    (Array.isArray(maidData?.data?.data) ? maidData.data.data : []).map(
      (item) => ({
        id: item.id,
        type: "maid_survey",
        submittedAt: item.created_at || item.submittedAt,
        supervisorName: item.supervisor_name || item.supervisorName,
        maidName: item.maid_name || item.maidName,
        age: item.age,
        mobileNumber: item.mobile_number || item.mobileNumber,
        address: item.address,
        housesCount: item.houses_count || item.housesCount,
        buildingsCount: item.buildings_count || item.buildingsCount,
        familyMembers: item.family_members || item.familyMembers,
        isOnlyEarningMember:
          item.only_earning_member ||
          item.is_only_earning_member ||
          item.isOnlyEarningMember,
        hasChildren: item.has_children || item.hasChildren,
        childrenGoingToSchool:
          item.children_school || item.childrenGoingToSchool,
        workTypes: item.work_types || item.workTypes,
        workHours: item.daily_work_hours || item.work_hours || item.workHours,
        workDurationInArea:
          item.area_experience ||
          item.work_duration_in_area ||
          item.workDurationInArea,
        chargePerHouse: item.charge_per_house || item.chargePerHouse,
        monthlyEarnings:
          item.monthly_income || item.monthly_earnings || item.monthlyEarnings,
        paidOnTime: item.paid_on_time || item.paidOnTime,
        holidays: item.holidays,
        paidLeave: item.paid_leave || item.paidLeave,
        hasSmartphone: item.has_smartphone || item.hasSmartphone,
        usesWhatsapp: item.uses_whatsapp || item.usesWhatsapp,
        knowsDigitalPayment:
          item.uses_online_payment ||
          item.knows_digital_payment ||
          item.knowsDigitalPayment,
        salaryAccountInterest:
          item.salary_online ||
          item.salary_account_interest ||
          item.salaryAccountInterest,
        appInterest:
          item.interested_extra_work_app ||
          item.app_interest ||
          item.appInterest,
        workPriority: item.work_priority || item.workPriority,
        safetyFeeling:
          item.feels_safe || item.safety_feeling || item.safetyFeeling,
        benefitsInterest:
          item.interested_in_benefits ||
          item.benefits_interest ||
          item.benefitsInterest,
      }),
    ) || [];

  const filteredResidentSubmissions = residentSubmissions.filter(
    (sub) =>
      sub.residentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.buildingName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.surveyorName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredMaidSubmissions = maidSubmissions.filter(
    (sub) =>
      sub.maidName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.supervisorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.mobileNumber?.includes(searchTerm),
  );

  // Pagination for Maid Submissions
  // Since we are using API pagination, currentMaidSubmissions is just the filtered list from the current page data
  const currentMaidSubmissions = filteredMaidSubmissions;
  const maidPageCount = maidData?.data?.last_page || 1;

  const handleDelete = (id) => {
    toast.error("Delete functionality not available yet");
  };

  const copySurveyLink = () => {
    const link =
      activeTab === "resident"
        ? `${window.location.origin}/resident-survey`
        : `${window.location.origin}/maid-information-form`;
    navigator.clipboard.writeText(link);
    toast.success(
      `${activeTab === "resident" ? "Resident" : "Maid"} survey link copied!`,
    );
  };

  const openSurveyForm = () => {
    const link =
      activeTab === "resident"
        ? `${window.location.origin}/resident-survey`
        : `${window.location.origin}/maid-information-form`;
    window.open(link, "_blank");
  };

  const handleExport = () => {
    const isResident = activeTab === "resident";
    const dataToExport = isResident
      ? filteredResidentSubmissions
      : filteredMaidSubmissions;

    if (dataToExport.length === 0) {
      toast.error("No data to export");
      return;
    }

    let headers = [];
    let csvRows = [];

    if (isResident) {
      headers = [
        "Submitted At",
        "Surveyor Name",
        "Building Name",
        "Flat Number",
        "Resident Name",
        "Members Count",
        "Maids Count",
        "Work Types",
        "Work Duration",
        "Time Slots",
        "Monthly Payment",
        "Extra Payment",
        "Reliability Rating",
        "Problems",
        "Finding Method",
        "App Openness",
        "Convincing Factors",
        "Join Whatsapp",
        "Phone Number",
      ];
      csvRows = [
        headers.join(","),
        ...dataToExport.map((row) =>
          [
            new Date(row.submittedAt).toLocaleDateString(),
            `"${row.surveyorName}"`,
            `"${row.buildingName}"`,
            `"${row.flatNumber}"`,
            `"${row.residentName}"`,
            row.membersCount,
            row.maidsCount,
            `"${row.workTypes?.join(", ") || ""}"`,
            `"${row.workDuration || ""}"`,
            `"${row.timeSlots?.join(", ") || ""}"`,
            `"${row.monthlyPayment}"`,
            `"${row.extraPayment || ""}"`,
            `"${row.reliabilityRating || ""}"`,
            `"${row.problems?.join(", ") || ""}"`,
            `"${row.findingMethod?.join(", ") || ""}"`,
            `"${row.appOpenness || ""}"`,
            `"${row.convincingFactors?.join(", ") || ""}"`,
            `"${row.joinWhatsapp || ""}"`,
            `"${row.whatsappNumber || ""}"`,
          ].join(","),
        ),
      ];
    } else {
      headers = [
        "Submitted At",
        "Supervisor Name",
        "Maid Name",
        "Age",
        "Mobile",
        "Address",
        "Family Members",
        "Children",
        "School Going",
        "Work Types",
        "Work Hours",
        "Duration in Area",
        "Charge Per House",
        "Monthly Earnings",
        "Paid on Time",
        "Holidays",
        "Smartphone",
        "Whatsapp",
        "Digital Payment",
        "Salary Interest",
        "Work Priority",
        "Safety Feeling",
      ];
      csvRows = [
        headers.join(","),
        ...dataToExport.map((row) =>
          [
            new Date(row.submittedAt).toLocaleDateString(),
            `"${row.supervisorName}"`,
            `"${row.maidName}"`,
            `"${row.age}"`,
            `"${row.mobileNumber}"`,
            `"${row.address}"`,
            row.familyMembers,
            row.hasChildren,
            row.childrenGoingToSchool,
            `"${row.workTypes?.join(", ") || ""}"`,
            `"${row.workHours}"`,
            `"${row.workDurationInArea}"`,
            `"${row.chargePerHouse}"`,
            `"${row.monthlyEarnings}"`,
            `"${row.paidOnTime}"`,
            `"${row.holidays}"`,
            `"${row.hasSmartphone}"`,
            `"${row.usesWhatsapp}"`,
            `"${row.knowsDigitalPayment}"`,
            `"${row.salaryAccountInterest}"`,
            `"${row.workPriority}"`,
            `"${row.safetyFeeling}"`,
          ].join(","),
        ),
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_surveys.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (
    (activeTab === "resident" && isResidentLoading) ||
    (activeTab === "maid" && isMaidLoading)
  ) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>

        <div className="flex gap-4 border-b border-gray-200">
          <div className="flex-1 h-12 bg-gray-100 animate-pulse rounded-t-lg"></div>
          <div className="flex-1 h-12 bg-gray-100 animate-pulse rounded-t-lg"></div>
        </div>

        <div className="h-10 w-64 bg-gray-200 rounded-xl animate-pulse"></div>

        <TableSkeleton columns={6} rows={8} />
      </div>
    );
  }

  if (activeTab === "resident" && residentError) {
    return (
      <div className="p-6 text-center text-red-500">
        Error loading surveys: {residentError.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Survey Submissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage collected survey data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openSurveyForm}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium"
          >
            <ExternalLink size={18} />
            Open Form
          </button>
          <button
            onClick={copySurveyLink}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-medium"
          >
            <Copy size={18} />
            Copy Link
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm font-medium"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("resident")}
          className={`flex-1 py-4 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2 ${
            activeTab === "resident"
              ? "text-primary border-b-2 border-primary bg-blue-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <User size={18} />
          Resident Surveys ({residentData?.count || 0})
        </button>
        <button
          onClick={() => setActiveTab("maid")}
          className={`flex-1 py-4 text-sm font-medium text-center transition-colors flex items-center justify-center gap-2 ${
            activeTab === "maid"
              ? "text-primary border-b-2 border-primary bg-blue-50/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Briefcase size={18} />
          Maid Surveys ({maidData?.count || 0})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder={`Search ${activeTab} surveys...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full sm:w-64"
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {activeTab === "resident" ? "Resident" : "Maid Name"}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {activeTab === "resident" ? "Location" : "Mobile"}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {activeTab === "resident" ? "Surveyor" : "Supervisor"}
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeTab === "resident" ? (
                filteredResidentSubmissions.length > 0 ? (
                  filteredResidentSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {sub.residentName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {sub.residentName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {sub.whatsappNumber || "No phone"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin size={14} className="text-gray-400" />
                          <span>
                            {sub.buildingName}, {sub.flatNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User size={14} className="text-gray-400" />
                          <span>{sub.surveyorName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium w-fit">
                            {sub.maidsCount} Maid(s)
                          </span>
                          <span className="text-xs text-gray-500">
                            {sub.monthlyPayment}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setSelectedSubmission({
                                ...sub,
                                type: "resident",
                              })
                            }
                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No resident surveys found
                    </td>
                  </tr>
                )
              ) : currentMaidSubmissions.length > 0 ? (
                currentMaidSubmissions.map((sub, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs">
                          {sub.maidName?.charAt(0) || "M"}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {sub.maidName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sub.age} years old
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {sub.mobileNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {sub.supervisorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {sub.workTypes?.slice(0, 2).map((t, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium"
                          >
                            {t.split(" ")[0]}
                          </span>
                        ))}
                        {sub.workTypes?.length > 2 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                            +{sub.workTypes.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setSelectedSubmission({ ...sub, type: "maid" })
                          }
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No maid surveys found (Mock Data)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of{" "}
            {activeTab === "resident"
              ? residentData?.data?.last_page || 1
              : maidPageCount}
          </span>
          <button
            onClick={() =>
              setPage((p) =>
                Math.min(
                  activeTab === "resident"
                    ? residentData?.data?.last_page || 1
                    : maidPageCount,
                  p + 1,
                ),
              )
            }
            disabled={
              page ===
              (activeTab === "resident"
                ? residentData?.data?.last_page || 1
                : maidPageCount)
            }
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedSubmission.type === "resident"
                  ? "Resident Survey Details"
                  : "Maid Survey Details"}
              </h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedSubmission.type === "resident" ? (
                // Resident Survey Details
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Resident Name
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.residentName}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        WhatsApp Phone Number
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.whatsappNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Building Name & Flat Number
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.buildingName},{" "}
                        {selectedSubmission.flatNumber}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Surveyor Name
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.surveyorName}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">
                      Work Requirements
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How many members are present?
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.membersCount}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How many maids work for you? (आपके यहाँ कितनी
                          कामवालियाँ हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.maidsCount}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How much do you pay your maid(s) every month?
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.monthlyPayment}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How long have they worked with you? (वे आपके यहाँ कब
                          से काम कर रही हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.workDuration}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How satisfied are you with their reliability? (1 =
                          Least, 5 = Most)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.reliabilityRating}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How much extra would you pay monthly for reliable
                          service?
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.extraPayment}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">
                          What type of work do they do? (वे क्या काम करती हैं?)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubmission.workTypes?.map((type, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium capitalize"
                            >
                              {type?.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">
                          What problems do you face most often? (आपको कौन सी
                          समस्याएँ आती हैं?)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubmission.problems?.map((type, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium capitalize"
                            >
                              {type?.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">
                          What are the time slots you prefer for work?
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubmission.timeSlots?.map((type, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">
                          How do you usually find new maids?
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubmission.findingMethod?.map((type, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium capitalize"
                            >
                              {type?.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block mb-2">
                          What would convince you most? (आपके लिए क्या सबसे
                          ज़रूरी होगा?)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {selectedSubmission.convincingFactors?.map(
                            (type, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-green-50 text-green-600 text-xs rounded-full font-medium capitalize"
                              >
                                {type?.replace(/_/g, " ")}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          Would you be open to using an app to manage your home
                          help (attendance, payments, scheduling)?
                        </span>
                        <span className="font-medium capitalize">
                          {selectedSubmission.appOpenness}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          Would you be interested in joining a verified WhatsApp
                          group for your building’s maids?
                        </span>
                        <span className="font-medium capitalize">
                          {selectedSubmission.joinWhatsapp}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Maid Survey Details
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Maid Name
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.maidName}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Mobile Number
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.mobileNumber}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Supervisor Name
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.supervisorName}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Age
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.age}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Maid residential address
                      </label>
                      <p className="font-medium text-gray-900">
                        {selectedSubmission.address}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">
                      Work & Family
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How many people are there in your family? (आपके परिवार
                          में कितने सदस्य हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.familyMembers}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          Are you the only earning member in your family? (क्या
                          आपके परिवार में सिर्फ़ आप ही कमाने वाली हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.isOnlyEarningMember}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          Do you have children? (क्या आपके बच्चे हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.hasChildren}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          Are your children going to school? (क्या आपके बच्चे
                          स्कूल जाते हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.childrenGoingToSchool}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How many houses do you currently work in?
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.housesCount}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How many buildings do you currently work in?
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.buildingsCount}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How many hours do you work everyday?
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.workHours}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How long have you been working in this area? (आप इस
                          बिल्डिंग/एरिया में कब से काम कर रही हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.workDurationInArea}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How much do you charge per house (average)? (आप हर घर
                          से औसतन कितने पैसे लेती हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.chargePerHouse}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          How much do you earn per month
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.monthlyEarnings}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          Do you get paid on time every month? (क्या आपको हर
                          महीने समय पर पैसे मिलते हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.paidOnTime}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          Do you get any holidays? (क्या आपको छुट्टी मिलती है?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.holidays}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block mb-1">
                          If you miss work due to illness or family issue, are
                          you paid? (अगर आप बीमार हों या छुट्टी लें तो क्या आपको
                          पैसे मिलते हैं?)
                        </span>
                        <span className="font-medium">
                          {selectedSubmission.paidLeave}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="text-xs text-gray-500 block mb-2">
                        What type of work do you do? (आप कौन-कौन सा काम करती
                        हैं?)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubmission.workTypes?.map((type, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-purple-50 text-purple-600 text-xs rounded-full font-medium"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">
                      Digital Profile
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          Do you have a smartphone? (क्या आपके पास स्मार्टफोन
                          है?)
                        </span>
                        <p className="font-medium">
                          {selectedSubmission.hasSmartphone}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          Do you use WhatsApp? (क्या आप WhatsApp इस्तेमाल करती
                          हैं?)
                        </span>
                        <p className="font-medium">
                          {selectedSubmission.usesWhatsapp}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          Do you know how to use Google Pay / PhonePe / Paytm?
                        </span>
                        <p className="font-medium">
                          {selectedSubmission.knowsDigitalPayment}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          Would you like to get your salary online directly to
                          your account? (क्या आप चाहेंगी कि आपकी सैलरी सीधे आपके
                          बैंक अकाउंट में आए?)
                        </span>
                        <p className="font-medium">
                          {selectedSubmission.salaryAccountInterest}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          If there was an app that helped you find extra houses
                          to work in, would you be interested? (अगर एक ऐप हो जो
                          आपको नया काम दिलाने में मदद करे, तो क्या आप उसमें
                          दिलचस्पी लेंगी?)
                        </span>
                        <p className="font-medium">
                          {selectedSubmission.appInterest}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          What is most important for you at work? (आपके लिए काम
                          में सबसे ज़रूरी क्या है?)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(selectedSubmission.workPriority) ? (
                            selectedSubmission.workPriority.map(
                              (priority, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium"
                                >
                                  {priority}
                                </span>
                              ),
                            )
                          ) : (
                            <p className="font-medium">
                              {selectedSubmission.workPriority}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          Do you feel safe working in all the houses? Do
                          residents treat you well (क्या आपको सभी घरों में काम
                          करते हुए सुरक्षित महसूस होता है?)
                        </span>
                        <p className="font-medium">
                          {selectedSubmission.safetyFeeling}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">
                          If you got access to benefits like health checkups,
                          savings plans, or small loans through the app, would
                          you be interested? (अगर आपको ऐप के ज़रिए स्वास्थ्य
                          जांच, बचत योजना या छोटे लोन जैसी सुविधाएँ मिलें, तो
                          क्या आप दिलचस्पी लेंगी?)
                        </span>
                        <p className="font-medium">
                          {selectedSubmission.benefitsInterest}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                Submitted on{" "}
                {new Date(selectedSubmission.submittedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyList;
