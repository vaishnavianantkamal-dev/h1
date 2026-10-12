import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "" : "https://hobit-backend.onrender.com");

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("Accept", "application/json");
      return headers;
    },
  }),
  tagTypes: [
    "ServicePlan",
    "Booking",
    "Event",
    "ServiceCategory",
    "Service",
    "Skill",
    "Commission",
    "User",
    "Role",
    "Worker",
    "City",
    "Zone",
    "ServiceableArea",
    "Transaction",
    "Withdrawal",
    "Contractor",
    "DeleteAccountRequest",
    "AddOn",
    "Pincode",
    "Cms",
    "SubscriptionType",
    "Alert",
    "ServiceEndAlert",
    "EmergencyAlert",
    "Enquiry",
    "DeepCleaningEnquiry",
    "ServiceRequest",
    "TimeSlot",
    "BlockedSlot",
    "SlotStatus",
    "Banner",
    "Setting",
    "OfficeLocation",
    "Attendance",
    "Marquee",
    "HomeCategory",
    "Campaign",
    "CancellationRequest",
    "PauseHistory",
  ],
  endpoints: (builder) => ({
    // --- Contractors ---
    getContractors: builder.query({
      query: () => "/api/contractors",
      providesTags: ["Contractor"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    getContractorDetails: builder.query({
      query: (id) => `/api/contractors/${id}`,
      providesTags: (result, error, id) => [{ type: "Contractor", id }],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),

    // --- Withdrawals ---
    getWithdrawals: builder.query({
      query: ({ page = 1 } = {}) => `/api/admin/withdrawals?page=${page}`,
      providesTags: ["Withdrawal"],
    }),
    approveWithdrawal: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/admin/withdrawals/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Withdrawal"],
    }),
    rejectWithdrawal: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/admin/withdrawals/${id}/reject`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Withdrawal"],
    }),

    // --- Transactions ---
    getTransactions: builder.query({
      query: ({ page = 1, date, from, to, city_id } = {}) => ({
        url: "/api/transactions",
        params: {
          page,
          ...(date ? { date } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(city_id ? { city_id } : {}),
        },
      }),
      providesTags: ["Transaction", "Booking"],
    }),
    exportTransactionsReport: builder.mutation({
      query: ({ format = "excel", date, from, to, status, city_id } = {}) => ({
        url: "/api/transactions/export",
        method: "GET",
        params: {
          format,
          ...(date ? { date } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(status ? { status } : {}),
          ...(city_id ? { city_id } : {}),
        },
        responseHandler: async (response) => response.blob(),
      }),
    }),

    // --- Cities ---
    getCities: builder.query({
      query: () => "/api/cities",
      providesTags: ["City"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createCity: builder.mutation({
      query: (newCity) => ({
        url: "/api/cities",
        method: "POST",
        body: newCity,
      }),
      invalidatesTags: ["City"],
    }),
    updateCity: builder.mutation({
      query: ({ id, ...updatedCity }) => ({
        url: `/api/cities/${id}`,
        method: "PUT",
        body: updatedCity,
      }),
      invalidatesTags: ["City"],
    }),
    deleteCity: builder.mutation({
      query: (id) => ({
        url: `/api/cities/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["City"],
    }),

    // --- Zones ---
    getZones: builder.query({
      query: () => "/api/zones",
      providesTags: ["Zone"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createZone: builder.mutation({
      query: (newZone) => ({
        url: "/api/zones",
        method: "POST",
        body: newZone,
      }),
      invalidatesTags: ["Zone"],
    }),
    updateZone: builder.mutation({
      query: ({ id, ...updatedZone }) => ({
        url: `/api/zones/${id}`,
        method: "PUT",
        body: updatedZone,
      }),
      invalidatesTags: ["Zone"],
    }),
    deleteZone: builder.mutation({
      query: (id) => ({
        url: `/api/zones/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Zone"],
    }),

    // --- Serviceable Areas ---
    getServiceableAreas: builder.query({
      query: () => "/api/serviceable-areas",
      providesTags: ["ServiceableArea"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createServiceableArea: builder.mutation({
      query: (newArea) => ({
        url: "/api/serviceable-areas",
        method: "POST",
        body: newArea,
      }),
      invalidatesTags: ["ServiceableArea"],
    }),
    updateServiceableArea: builder.mutation({
      query: ({ id, ...updatedArea }) => ({
        url: `/api/serviceable-areas/${id}`,
        method: "PUT",
        body: updatedArea,
      }),
      invalidatesTags: ["ServiceableArea"],
    }),
    deleteServiceableArea: builder.mutation({
      query: (id) => ({
        url: `/api/serviceable-areas/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ServiceableArea"],
    }),

    // --- Service Categories ---
    getServiceCategories: builder.query({
      query: () => "/api/service-categories",
      providesTags: ["ServiceCategory"],
      transformResponse: (response) => {
        // Normalize response to ensure we always get an array
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createServiceCategory: builder.mutation({
      query: (newCategory) => ({
        url: "/api/service-categories",
        method: "POST",
        body: newCategory,
      }),
      invalidatesTags: ["ServiceCategory"],
    }),
    updateServiceCategory: builder.mutation({
      query: ({ id, ...updatedCategory }) => ({
        url: `/api/service-categories/${id}`,
        method: "PUT",
        body: updatedCategory,
      }),
      invalidatesTags: ["ServiceCategory"],
    }),
    deleteServiceCategory: builder.mutation({
      query: (id) => ({
        url: `/api/service-categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ServiceCategory"],
    }),

    // --- Roles ---
    getRoles: builder.query({
      query: () => "/api/roles",
      providesTags: ["Role"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createRole: builder.mutation({
      query: (newRole) => ({
        url: "/api/roles",
        method: "POST",
        body: newRole,
      }),
      invalidatesTags: ["Role"],
    }),
    updateRole: builder.mutation({
      query: ({ id, ...updatedRole }) => ({
        url: `/api/roles/${id}`,
        method: "PUT",
        body: updatedRole,
      }),
      invalidatesTags: ["Role"],
    }),
    updateRolePermissions: builder.mutation({
      query: ({ id, permission_ids }) => ({
        url: `/api/roles/${id}/permissions`,
        method: "POST",
        body: { permission_ids },
      }),
      invalidatesTags: ["Role"],
    }),
    getRole: builder.query({
      query: (id) => `/api/roles/${id}`,
      providesTags: (result, error, id) => [{ type: "Role", id }],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
    deleteRole: builder.mutation({
      query: (id) => ({
        url: `/api/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Role"],
    }),
    getPermissions: builder.query({
      query: () => "/api/permissions",
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),

    // --- Users ---
    getUsers: builder.query({
      query: ({ page = 1, per_page } = {}) => ({
        url: "/api/admin/users",
        params: {
          ...(page ? { page } : {}),
          ...(per_page ? { per_page } : {}),
        },
      }),
      providesTags: ["User"],
      transformResponse: (response) => {
        if (Array.isArray(response)) {
          return { data: response, meta: null };
        }
        return {
          data: response?.data || [],
          meta: {
            current_page: response?.current_page ?? 1,
            last_page: response?.last_page ?? 1,
            total: response?.total ?? 0,
            per_page: response?.per_page ?? 20,
            from: response?.from ?? 0,
            to: response?.to ?? 0,
          },
        };
      },
    }),
    updateUser: builder.mutation({
      query: ({ id, ...updatedUser }) => ({
        url: `/api/admin/users/${id}`,
        method: "PUT",
        body: updatedUser,
      }),
      invalidatesTags: ["User"],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/api/admin/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    getUserProfile: builder.query({
      query: (id) => `/api/admin/user_profile/${id}`,
      providesTags: ["User"],
      transformResponse: (response) => {
        return response.user || response;
      },
    }),

    // --- Referrals ---
    getReferrals: builder.query({
      query: ({ page = 1 } = {}) => `/api/referral?page=${page}`,
      providesTags: ["Referral"],
      transformResponse: (response) => {
        const usersData = response?.users?.data || [];

        const formatTypeFromRole = (roleId) => {
          if (roleId === 3) return "Worker";
          if (roleId === 5) return "Customer";
          return "User";
        };

        const formatType = (type) => {
          if (!type) return "User";
          const singular = type.endsWith("s") ? type.slice(0, -1) : type;
          return singular.charAt(0).toUpperCase() + singular.slice(1);
        };

        const mappedUsers = usersData.map((user) => {
          const rawReferrals = Array.isArray(user.referrals)
            ? user.referrals
            : [];

          const referrals = rawReferrals.map((ref) => {
            const referredUser = ref.referred_user || {};
            return {
              id: ref.id,
              points: Number(ref.points) || 0,
              createdAt: ref.created_at || "",
              type:
                formatTypeFromRole(referredUser.role_id) ||
                formatType(ref.referred_user_type),
              user: {
                id: referredUser.id || ref.referred_user_id,
                name: referredUser.name || "Unknown",
                phone: referredUser.phone || "",
                roleId: referredUser.role_id || null,
              },
            };
          });

          const totalPoints =
            user.referral_points != null
              ? Number(user.referral_points) || 0
              : referrals.reduce((sum, r) => sum + (r.points || 0), 0);

          const status =
            referrals.length > 0 && referrals.some((r) => r.user && r.user.id)
              ? "Completed"
              : "Pending";

          return {
            id: user.id,
            referrer: {
              id: user.public_id || user.id || "N/A",
              name: user.name || "Unknown",
              type: formatTypeFromRole(user.role_id),
              avatar: user.avatar || null,
              email: user.email || null,
              phone: user.phone || "",
            },
            referrals,
            referralCount: referrals.length,
            totalPoints,
            status,
            date: user.created_at?.split("T")[0] || "",
          };
        });

        return {
          data: mappedUsers,
          meta: {
            current_page: response?.users?.current_page,
            last_page: response?.users?.last_page,
            total: response?.users?.total,
          },
        };
      },
    }),
    getReferralLink: builder.query({
      query: () => "/api/referral/my-link",
      transformResponse: (response) => {
        const data = response.data || response;
        if (data?.referral_link) {
          data.referral_link = data.referral_link.replace(
            "/api/register",
            "/register",
          );
        }
        return data;
      },
    }),

    // --- Ratings ---
    getAllRatings: builder.query({
      query: ({ page = 1 } = {}) => `/api/all_ratings?page=${page}`,
      providesTags: ["Rating"],
    }),
    getAvgRatings: builder.query({
      query: ({ page = 1 } = {}) => `/api/avg_ratings?page=${page}`,
      providesTags: ["Rating"],
    }),

    // --- Services ---
    getServices: builder.query({
      // Accepts an optional city filter — either a raw city id or { city_id }.
      query: (arg) => {
        const cityId = arg && typeof arg === "object" ? arg.city_id : arg;
        return {
          url: "/api/services",
          params: cityId ? { city_id: cityId } : undefined,
        };
      },
      providesTags: ["Service"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    getServicesByCategory: builder.query({
      query: (categoryId) => `/api/services-by-category/${categoryId}`,
      providesTags: (result, error, categoryId) => [
        { type: "Service", id: categoryId },
      ],
      transformResponse: (response) => {
        // API returns { category_id, category_name, is_member, services: { data: [...], pagination } }
        if (response && response.services && response.services.data) {
          return response.services.data;
        }
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createService: builder.mutation({
      query: (newService) => ({
        url: "/api/services",
        method: "POST",
        body: newService,
      }),
      invalidatesTags: ["Service"],
    }),
    updateService: builder.mutation({
      query: ({ id, ...updatedService }) => ({
        url: `/api/services/${id}`,
        method: "PUT",
        body: updatedService,
      }),
      invalidatesTags: ["Service"],
    }),
    deleteService: builder.mutation({
      query: (id) => ({
        url: `/api/services/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Service"],
    }),

    // --- Add-ons ---
    getAddOns: builder.query({
      query: () => "/api/addons",
      providesTags: ["AddOn"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createAddOn: builder.mutation({
      query: (newAddOn) => ({
        url: "/api/addons",
        method: "POST",
        body: newAddOn,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
      invalidatesTags: ["AddOn"],
    }),
    updateAddOn: builder.mutation({
      query: ({ id, data }) => ({
        url: `/api/addons/${id}`,
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
      invalidatesTags: ["AddOn"],
    }),
    deleteAddOn: builder.mutation({
      query: (id) => ({
        url: `/api/addons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AddOn"],
    }),

    // --- Subscription Types ---
    getSubscriptionTypes: builder.query({
      query: () => "/api/subscription-types",
      providesTags: ["SubscriptionType"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    createSubscriptionType: builder.mutation({
      query: ({ name }) => ({
        url: "/api/subscription-types",
        method: "POST",
        body: { name },
      }),
      invalidatesTags: ["SubscriptionType"],
    }),
    updateSubscriptionType: builder.mutation({
      query: ({ id, name }) => ({
        url: `/api/subscription-types/${id}`,
        method: "PUT",
        body: { name },
      }),
      invalidatesTags: ["SubscriptionType"],
    }),
    deleteSubscriptionType: builder.mutation({
      query: (id) => ({
        url: `/api/subscription-types/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SubscriptionType"],
    }),

    // --- Commissions ---
    getCommissionSummary: builder.query({
      query: () => "/api/admin/commission/summary",
      providesTags: ["Commission"],
      transformResponse: (response) => {
        return response.data || {};
      },
    }),
    getCommissions: builder.query({
      query: () => "/api/admin/commissions",
      providesTags: ["Commission"],
      transformResponse: (response) => {
        const data = Array.isArray(response) ? response : response.data || [];
        return data.map((item) => ({
          ...item,
          serviceId: item.service_id || item.serviceId,
          type:
            (item.commission_type || item.type || "").toLowerCase() ===
            "percentage"
              ? "percentage"
              : "fixed",
          status:
            (item.status || "").toLowerCase() === "active"
              ? "Active"
              : "Inactive",
        }));
      },
    }),
    createCommission: builder.mutation({
      query: (newCommission) => ({
        url: "/api/admin/commissions",
        method: "POST",
        body: newCommission,
      }),
      invalidatesTags: ["Commission"],
    }),
    updateCommission: builder.mutation({
      query: ({ id, ...updatedCommission }) => ({
        url: `/api/admin/commissions/${id}`,
        method: "PUT",
        body: updatedCommission,
      }),
      invalidatesTags: ["Commission"],
    }),
    deleteCommission: builder.mutation({
      query: (id) => ({
        url: `/api/admin/commissions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Commission"],
    }),

    // --- Auth (Basic example, might need more specific handling) ---
    login: builder.mutation({
      query: (credentials) => ({
        url: "/api/login",
        method: "POST",
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: "/api/register",
        method: "POST",
        body: userData,
      }),
    }),
    // --- Forgot Password ---
    sendForgotPasswordOtp: builder.mutation({
      query: (phoneData) => ({
        url: "/api/admin/forgot-password/send-otp",
        method: "POST",
        body: phoneData,
      }),
    }),
    resetPassword: builder.mutation({
      query: (resetData) => ({
        url: "/api/admin/forgot-password/reset",
        method: "POST",
        body: resetData,
      }),
    }),

    // --- Account Deletion Requests ---
    getDeleteAccountRequests: builder.query({
      query: () => "/api/delete-account-requests",
      providesTags: ["DeleteAccountRequest"],
      transformResponse: (response) => {
        return response.data || [];
      },
    }),
    approveDeleteAccountRequest: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/api/delete-account-requests/${id}`,
        method: "POST",
        body: { status: "approved", reason },
      }),
      invalidatesTags: ["DeleteAccountRequest"],
    }),
    rejectDeleteAccountRequest: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/api/delete-account-requests/${id}`,
        method: "POST",
        body: { status: "rejected", reason },
      }),
      invalidatesTags: ["DeleteAccountRequest"],
    }),

    // --- Workers ---
    getWorkerMe: builder.query({
      query: () => "/api/worker/me",
      providesTags: ["Worker"],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
    withdrawWorker: builder.mutation({
      query: (data) => ({
        url: "/api/worker/withdraw",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Withdrawal"],
    }),
    getWorkers: builder.query({
      query: () => "/api/admin/workers",
      providesTags: ["Worker"],
      transformResponse: (response) => {
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    getWorkersPaginated: builder.query({
      query: ({ page = 1, search, category_id, city_id } = {}) => ({
        url: "/api/admin/workers",
        params: {
          page,
          ...(search ? { search } : {}),
          ...(category_id ? { category_id } : {}),
          ...(city_id ? { city_id } : {}),
        },
      }),
      providesTags: ["Worker"],
      transformResponse: (response) => {
        return response;
      },
    }),
    createWorker: builder.mutation({
      query: (newWorker) => ({
        url: "/api/admin/workers",
        method: "POST",
        body: newWorker,
      }),
      invalidatesTags: ["Worker"],
    }),
    updateWorker: builder.mutation({
      query: ({ id, data, ...updatedWorker }) => {
        const payload = data ?? updatedWorker;
        if (payload instanceof FormData) {
          payload.append("_method", "PUT");
          return {
            url: `/api/admin/worker/${id}/update`,
            method: "POST",
            body: payload,
          };
        }
        return {
          url: `/api/admin/worker/${id}/update`,
          method: "POST",
          body: { ...payload, _method: "PUT" },
        };
      },
      invalidatesTags: ["Worker"],
    }),
    deleteWorker: builder.mutation({
      query: (id) => ({
        url: `/api/admin/worker/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Worker"],
    }),
    registerWorker: builder.mutation({
      query: (workerData) => ({
        url: "/api/worker/register",
        method: "POST",
        body: workerData,
      }),
      invalidatesTags: ["Worker"],
    }),
    uploadWorkerKyc: builder.mutation({
      query: ({ token, kycData }) => ({
        url: "/api/worker/kyc/upload",
        method: "POST",
        body: kycData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    }),
    uploadWorkerDocs: builder.mutation({
      query: ({ id, kycData }) => ({
        url: `/api/worker/${id}/docs`,
        method: "POST",
        body: kycData,
      }),
      invalidatesTags: ["Worker"],
    }),
    initializeWorkerKyc: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/kyc/initialize",
        method: "POST",
        body: payload,
      }),
    }),
    getWorkerKycStatus: builder.query({
      query: (workerId) => `/api/admin/kyc/status?worker_id=${workerId}`,
    }),
    approveWorkerKyc: builder.mutation({
      query: (id) => ({
        url: `/api/admin/workers/${id}/approve-kyc`,
        method: "POST",
      }),
      invalidatesTags: ["Worker"],
    }),
    rejectWorkerKyc: builder.mutation({
      query: (id) => ({
        url: `/api/admin/workers/${id}/reject-kyc`,
        method: "POST",
      }),
      invalidatesTags: ["Worker"],
    }),
    getUnassignedWorkers: builder.query({
      query: (arg) => {
        // Accept either a raw bookingId or an object { bookingId, search }
        const bookingId = arg && typeof arg === "object" ? arg.bookingId : arg;
        const search = arg && typeof arg === "object" ? arg.search : undefined;
        const base = bookingId
          ? `/api/admin/unassigned_worker/${bookingId}`
          : "/api/admin/unassigned_worker";
        return {
          url: base,
          params: {
            ...(search ? { search } : {}),
          },
        };
      },
      transformResponse: (response) => {
        // If response has available_workers array (new format), return it
        if (response?.available_workers) {
          return response.available_workers;
        }
        // Fallback for old format or other responses
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    getPreviousBookingWorkers: builder.query({
      query: (bookingId) => ({
        url: `/api/admin/booking/${bookingId}/previous-workers`,
      }),
      transformResponse: (response) => {
        if (!response) return [];
        if (Array.isArray(response)) return response;
        if (Array.isArray(response.workers)) return response.workers;
        return response.data || [];
      },
    }),
    assignBooking: builder.mutation({
      query: (assignmentData) => ({
        url: "/api/admin/assign-booking",
        method: "POST",
        body: assignmentData,
      }),
      invalidatesTags: ["Booking"],
    }),
    reassignBooking: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/reassign-booking",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Booking"],
    }),

    updateWorkerBankById: builder.mutation({
      query: (payload) => ({
        url: "/api/worker/update_bank_by_id",
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Worker"],
    }),

    getWorkerBankDetailsById: builder.query({
      query: (userId) => `/api/worker/bank-details_by_id/${userId}`,
      transformResponse: (response) => response.data || response,
      providesTags: ["Worker"],
    }),

    // --- Customers (booking customers only — backend computes stats + nested bookings)
    getCustomers: builder.query({
      query: ({
        page = 1,
        per_page,
        search,
        payment_status,
        status,
        city_id,
      } = {}) => ({
        url: "/api/allcustomers/bookings",
        params: {
          page,
          ...(per_page ? { per_page } : {}),
          ...(search ? { search } : {}),
          ...(payment_status ? { payment_status } : {}),
          ...(status ? { status } : {}),
          ...(city_id ? { city_id } : {}),
        },
      }),
      transformResponse: (response) => ({
        data: response?.data || [],
        stats: response?.stats || null,
        meta: {
          total: response?.total ?? 0,
          per_page: response?.per_page ?? 20,
          current_page: response?.current_page ?? 1,
          last_page: response?.last_page ?? 1,
        },
      }),
      providesTags: ["User", "Booking"],
    }),

    // --- Bot Bookings ---
    // --- Notifications ---
    getNotifications: builder.query({
      query: () => "/api/notifications",
      providesTags: ["Booking"], // Re-fetch when bookings change
    }),
    markNotificationAsRead: builder.mutation({
      query: (id) => ({
        url: `/api/notifications/read/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["Booking"],
    }),

    getAlerts: builder.query({
      query: () => "/api/alerts",
      providesTags: ["Alert"],
    }),
    markAlertsRead: builder.mutation({
      query: (body) => ({
        url: "/api/alerts/mark-read",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Alert"],
    }),

    // --- Service End Alerts (Admin) ---
    getServiceEndAlerts: builder.query({
      query: ({ page = 1 } = {}) => ({
        url: "/api/admin/service-end-alerts",
        params: { page },
      }),
      providesTags: ["ServiceEndAlert"],
    }),
    markServiceEndAlertRead: builder.mutation({
      query: (id) => ({
        url: `/api/admin/service-end-alerts/read/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["ServiceEndAlert"],
    }),
    markAllServiceEndAlertsRead: builder.mutation({
      query: () => ({
        url: "/api/admin/service-end-alerts/read-all",
        method: "PUT",
      }),
      invalidatesTags: ["ServiceEndAlert"],
    }),

    // --- Emergency / SOS Alerts (Admin) ---
    getEmergencyAlerts: builder.query({
      query: ({ page = 1 } = {}) => ({
        url: "/api/admin/emergency-alerts",
        params: { page },
      }),
      providesTags: ["EmergencyAlert"],
    }),
    getEmergencyAlert: builder.query({
      query: (id) => `/api/admin/emergency-alerts/${id}`,
      transformResponse: (response) => response.data || response,
      providesTags: (result, error, id) => [{ type: "EmergencyAlert", id }],
    }),
    acknowledgeEmergencyAlert: builder.mutation({
      query: ({ id, note }) => ({
        url: `/api/admin/emergency-alerts/${id}/acknowledge`,
        method: "POST",
        body: note ? { note } : {},
      }),
      invalidatesTags: (result, error, { id }) => [
        "EmergencyAlert",
        { type: "EmergencyAlert", id },
      ],
    }),
    resolveEmergencyAlert: builder.mutation({
      query: ({ id, note }) => ({
        url: `/api/admin/emergency-alerts/${id}/resolve`,
        method: "POST",
        body: note ? { note } : {},
      }),
      invalidatesTags: (result, error, { id }) => [
        "EmergencyAlert",
        { type: "EmergencyAlert", id },
      ],
    }),

    // --- All Bookings (Internal) ---
    getAllBookings: builder.query({
      query: ({
        page,
        status,
        today,
        per_page,
        search,
        from_date,
        to_date,
        subscription_type_id,
        payment_status,
        category_id,
        city_id,
        rescheduled,
        extended,
        slot_from,
        slot_to,
      } = {}) => ({
        url: "/api/getbookings",
        params: {
          ...(page ? { page } : {}),
          ...(per_page ? { per_page } : {}),
          ...(status ? { status } : {}),
          ...(today ? { today: true } : {}),
          ...(search ? { search } : {}),
          ...(from_date ? { from_date } : {}),
          ...(to_date ? { to_date } : {}),
          ...(subscription_type_id ? { subscription_type_id } : {}),
          ...(payment_status ? { payment_status } : {}),
          ...(category_id ? { category_id } : {}),
          ...(city_id ? { city_id } : {}),
          ...(rescheduled ? { rescheduled } : {}),
          ...(extended ? { extended } : {}),
          ...(slot_from ? { slot_from } : {}),
          ...(slot_to ? { slot_to } : {}),
        },
      }),
      transformResponse: (response) => {
        return {
          data: response?.data || [],
          stats: response?.stats || null,
          meta: {
            total: response?.total ?? 0,
            per_page: response?.per_page ?? 20,
            current_page: response?.current_page ?? 1,
            last_page: response?.last_page ?? 1,
            applied_filters: response?.applied_filters ?? [],
            count: response?.count ?? 0,
          },
        };
      },
      providesTags: ["Booking"],
    }),

    // --- Customer Cancellation Requests ---
    getCancellationRequests: builder.query({
      query: ({ page, per_page } = {}) => ({
        url: "/api/admin/bookings/cancellation-requests",
        params: {
          ...(page ? { page } : {}),
          ...(per_page ? { per_page } : {}),
        },
      }),
      transformResponse: (response) => {
        const paginator = response?.data || {};
        return {
          data: paginator.data || [],
          meta: {
            current_page: paginator.current_page ?? 1,
            last_page: paginator.last_page ?? 1,
            per_page: paginator.per_page ?? 15,
            total: paginator.total ?? 0,
          },
        };
      },
      providesTags: ["CancellationRequest"],
    }),
    approveCancellationRequest: builder.mutation({
      query: (id) => ({
        url: `/api/admin/bookings/${id}/cancellation/approve`,
        method: "POST",
      }),
      invalidatesTags: ["CancellationRequest", "Booking"],
    }),
    rejectCancellationRequest: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/api/admin/bookings/${id}/cancellation/reject`,
        method: "POST",
        body: reason ? { reason } : {},
      }),
      invalidatesTags: ["CancellationRequest", "Booking"],
    }),

    exportBookingsReport: builder.mutation({
      query: ({
        format,
        status,
        date,
        from_date,
        to_date,
        today,
        subscription_type_id,
        payment_status,
        category_id,
        city_id,
        rescheduled,
        slot_from,
        slot_to,
      } = {}) => ({
        url: "/api/bookings/export",
        method: "GET",
        params: {
          ...(format ? { format } : {}),
          ...(status ? { status } : {}),
          ...(date ? { date } : {}),
          ...(from_date ? { from_date } : {}),
          ...(to_date ? { to_date } : {}),
          ...(today ? { today: 1 } : {}),
          ...(subscription_type_id ? { subscription_type_id } : {}),
          ...(payment_status ? { payment_status } : {}),
          ...(category_id ? { category_id } : {}),
          ...(city_id ? { city_id } : {}),
          ...(rescheduled ? { rescheduled } : {}),
          ...(slot_from ? { slot_from } : {}),
          ...(slot_to ? { slot_to } : {}),
        },
        responseHandler: async (response) => response.blob(),
      }),
    }),
    getCoordinators: builder.query({
      query: () => ({
        url: "/api/coordinators",
        method: "GET",
      }),
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.coordinators)) return response.coordinators;
        return response?.data || [];
      },
    }),
    assignCoordinator: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/assign-coordinator",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Booking"],
    }),
    reassignCoordinator: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/reassign-coordinator",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Booking"],
    }),
    getWhatsappCoordinators: builder.mutation({
      query: () => ({
        url: "/api/coordinators",
        method: "GET",
      }),
    }),
    sendBookingToWhatsappCoordinator: builder.mutation({
      query: ({ coordinator_id, booking_id }) => ({
        url: "/api/whatsapp/send-booking",
        method: "POST",
        body: { coordinator_id, booking_id },
      }),
    }),

    // --- Events ---
    getEvents: builder.query({
      query: () => "/api/events",
      providesTags: ["Event"],
      transformResponse: (response) => response?.events || [],
    }),
    createEvent: builder.mutation({
      query: (formData) => ({
        url: "/api/events",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Event"],
    }),
    deleteEvent: builder.mutation({
      query: (id) => ({
        url: `/api/events/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Event"],
    }),

    getInstantBookingExtensions: builder.query({
      query: (bookingId) => `/api/instant-bookings/${bookingId}/extensions`,
      transformResponse: (response) => response.booking,
    }),

    getRescheduleHistory: builder.query({
      query: (bookingId) =>
        `/api/customer/bookings/${bookingId}/reschedule-history`,
      transformResponse: (response) => response.data,
    }),

    // --- Overview ---
    getOverview: builder.query({
      query: (paramsArg) => {
        const params =
          typeof paramsArg === "string"
            ? { filter: paramsArg }
            : {
                ...(paramsArg?.filter ? { filter: paramsArg.filter } : {}),
                ...(paramsArg?.from_date
                  ? { from_date: paramsArg.from_date }
                  : {}),
                ...(paramsArg?.to_date ? { to_date: paramsArg.to_date } : {}),
                ...(paramsArg?.city_id ? { city_id: paramsArg.city_id } : {}),
              };
        return {
          url: "/api/overview",
          params: Object.keys(params).length ? params : undefined,
        };
      },
      transformResponse: (response) => {
        // console.log("API Response:", response);
        return response.data || response;
      },
    }),
    updateBookingStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/api/bookings/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Booking"],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
    updateBooking: builder.mutation({
      query: ({ id, ...bookingData }) => ({
        url: `/api/admin/bookings/${id}`,
        method: "PUT",
        body: bookingData,
      }),
      invalidatesTags: ["Booking"],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
    pauseBookingSubscription: builder.mutation({
      query: ({ booking_id, ...body }) => ({
        url: `/api/admin/bookings/${booking_id}/subscription/pause`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Booking", "PauseHistory"],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
    getPauseHistory: builder.query({
      query: (bookingId) =>
        `/api/admin/bookings/${bookingId}/subscription/pause-history`,
      transformResponse: (response) => response.data || response,
      providesTags: ["PauseHistory"],
    }),
    sendPaymentLink: builder.mutation({
      query: (payload) => ({
        url: "/api/booking/send-payment-link",
        method: "POST",
        body: payload,
      }),
    }),
    sendBothOtp: builder.mutation({
      query: (payload) => ({
        url: "/api/booking/send-both-otp",
        method: "POST",
        body: payload,
      }),
    }),
    /*
    sendStartOtp: builder.mutation({
      query: (payload) => ({
        url: "/api/booking/send-start-otp",
        method: "POST",
        body: payload,
      }),
    }),
    sendCloseOtp: builder.mutation({
      query: (payload) => ({
        url: "/api/booking/send-close-otp",
        method: "POST",
        body: payload,
      }),
    }),
    */
    updateWorkerLocation: builder.mutation({
      query: (payload) => ({
        url: "/api/worker/location",
        method: "POST",
        body: payload,
      }),
    }),
    // --- Resident Surveys ---
    createResidentSurvey: builder.mutation({
      query: (surveyData) => ({
        url: "/api/resident-surveys",
        method: "POST",
        body: surveyData,
      }),
      invalidatesTags: ["ResidentSurvey"],
    }),
    getResidentSurveys: builder.query({
      query: ({ page = 1 } = {}) => `/api/resident-surveys?page=${page}`,
      providesTags: ["ResidentSurvey"],
    }),

    // --- Maid Surveys ---
    createMaidSurvey: builder.mutation({
      query: (surveyData) => ({
        url: "/api/maid-survey",
        method: "POST",
        body: surveyData,
      }),
      invalidatesTags: ["MaidSurvey"],
    }),
    getMaidSurveys: builder.query({
      query: ({ page = 1 } = {}) => `/api/maid-survey?page=${page}`,
      providesTags: ["MaidSurvey"],
    }),
    getWorkerBookings: builder.query({
      query: (id) => `/api/worker-bookings/${id}`,
      providesTags: ["Booking"],
    }),
    getReferrersDropdown: builder.query({
      query: () => "/api/referrers/dropdown",
      transformResponse: (response) => {
        return Array.isArray(response.data) ? response.data : [];
      },
    }),
    getDonts: builder.query({
      query: (serviceId) => `/api/services/${serviceId}/dos-donts`,
      transformResponse: (response) => {
        return Array.isArray(response.data) ? response.data : [];
      },
    }),
    getAllServiceDonts: builder.query({
      query: () => "/api/service-dos-donts",
      transformResponse: (response) => {
        return Array.isArray(response.data) ? response.data : [];
      },
    }),
    getServiceDonts: builder.query({
      query: (serviceId) => `/api/service-dos-donts/${serviceId}`,
      transformResponse: (response) => {
        return Array.isArray(response.data) ? response.data : [];
      },
    }),
    getCoupons: builder.query({
      query: ({ page = 1, status = null, search = null } = {}) => {
        let url = `/api/coupons?page=${page}`;
        if (status !== null) url += `&status=${status}`;
        if (search) url += `&search=${search}`;
        return url;
      },
      transformResponse: (response) => {
        return response.data || {};
      },
    }),
    createCoupon: builder.mutation({
      query: (couponData) => ({
        url: "/api/coupons",
        method: "POST",
        body: couponData,
      }),
      invalidatesTags: ["Coupon"],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
    updateCoupon: builder.mutation({
      query: ({ couponId, couponData }) => ({
        url: `/api/coupons/${couponId}`,
        method: "PUT",
        body: couponData,
      }),
      invalidatesTags: ["Coupon"],
      transformResponse: (response) => {
        return response.data || response;
      },
    }),
    deleteCoupon: builder.mutation({
      query: (couponId) => ({
        url: `/api/coupons/${couponId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Coupon"],
    }),
    // Do's & Don'ts (service-dos-donts)
    createDont: builder.mutation({
      query: (dontData) => ({
        url: "/api/service-dos-donts",
        method: "POST",
        body: dontData,
      }),
      transformResponse: (response) => response.data || response,
    }),
    updateDont: builder.mutation({
      query: ({ id, ...dontData }) => ({
        url: `/api/service-dos-donts/${id}`,
        method: "POST",
        body: dontData,
      }),
      transformResponse: (response) => response.data || response,
    }),
    deleteDont: builder.mutation({
      query: (id) => ({
        url: `/api/service-dos-donts/${id}`,
        method: "DELETE",
      }),
    }),

    // Pincodes CRUD
    getPincodes: builder.query({
      query: (params) => ({
        url: "/api/pincodes",
        params,
      }),
      providesTags: ["Pincode"],
    }),
    createPincode: builder.mutation({
      query: (newPincode) => ({
        url: "/api/pincodes",
        method: "POST",
        body: newPincode,
      }),
      invalidatesTags: ["Pincode"],
    }),
    updatePincode: builder.mutation({
      query: ({ id, ...updatedPincode }) => ({
        url: `/api/pincodes/${id}`,
        method: "PUT",
        body: updatedPincode,
      }),
      invalidatesTags: ["Pincode"],
    }),
    deletePincode: builder.mutation({
      query: (id) => ({
        url: `/api/pincodes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Pincode"],
    }),

    // CMS
    getCmsContent: builder.query({
      query: (endpoint) => `/api/cms/${endpoint}`,
      providesTags: (result, error, endpoint) => [
        { type: "Cms", id: endpoint },
      ],
    }),

    // --- Enquiries ---
    getEnquiries: builder.query({
      query: ({ page = 1 } = {}) => `/api/enquiries?page=${page}`,
      providesTags: ["Enquiry"],
    }),
    createEnquiry: builder.mutation({
      query: (enquiryData) => ({
        url: "/api/enquiries",
        method: "POST",
        body: enquiryData,
      }),
      invalidatesTags: ["Enquiry"],
    }),
    updateEnquiry: builder.mutation({
      query: ({ id, ...enquiryData }) => ({
        url: `/api/enquiries/${id}`,
        method: "PUT",
        body: enquiryData,
      }),
      invalidatesTags: ["Enquiry"],
    }),
    deleteEnquiry: builder.mutation({
      query: (id) => ({
        url: `/api/enquiries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Enquiry"],
    }),
    getDeepCleaningEnquiries: builder.query({
      query: ({ page = 1 } = {}) =>
        `/api/deep-cleaning-enquiries?page=${page}`,
      providesTags: ["DeepCleaningEnquiry"],
    }),

    // --- Hobit1: website service booking requests ---
    getServiceRequests: builder.query({
      query: ({ page = 1, status = "", search = "" } = {}) => {
        const params = new URLSearchParams({ page: String(page) });
        if (status) params.set("status", status);
        if (search) params.set("search", search);
        return `/api/service-requests?${params}`;
      },
      providesTags: ["ServiceRequest"],
    }),
    updateServiceRequestStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/api/service-requests/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["ServiceRequest"],
    }),

    // --- Time Slots (Slot Master) ---
    getTimeSlots: builder.query({
      query: ({ with_trashed } = {}) => ({
        url: "/api/admin/time-slots",
        params: with_trashed ? { with_trashed: true } : {},
      }),
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: ["TimeSlot"],
    }),
    getTimeSlot: builder.query({
      query: (id) => `/api/admin/time-slots/${id}`,
      transformResponse: (response) => response?.data || response,
      providesTags: (result, error, id) => [{ type: "TimeSlot", id }],
    }),
    createTimeSlot: builder.mutation({
      query: (body) => ({
        url: "/api/admin/time-slots",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TimeSlot"],
    }),
    createBulkTimeSlots: builder.mutation({
      query: (body) => ({
        url: "/api/admin/time-slots/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TimeSlot"],
    }),
    updateTimeSlot: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/admin/time-slots/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["TimeSlot"],
    }),
    deleteTimeSlot: builder.mutation({
      query: (id) => ({
        url: `/api/admin/time-slots/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TimeSlot"],
    }),
    restoreTimeSlot: builder.mutation({
      query: (id) => ({
        url: `/api/admin/time-slots/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: ["TimeSlot"],
    }),

    // --- Time Slot Blocking (Block Management) ---
    getBlockedSlots: builder.query({
      query: ({ date, category_id, from_date, to_date } = {}) => ({
        url: "/api/admin/time-slots/blocked",
        params: {
          ...(date ? { date } : {}),
          ...(category_id ? { category_id } : {}),
          ...(from_date ? { from_date } : {}),
          ...(to_date ? { to_date } : {}),
        },
      }),
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: ["BlockedSlot"],
    }),
    getSlotStatus: builder.query({
      query: ({ date, category_id } = {}) => ({
        url: "/api/time-slots/status",
        params: {
          ...(date ? { date } : {}),
          ...(category_id ? { category_id } : {}),
        },
      }),
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: ["SlotStatus"],
    }),
    blockTimeSlots: builder.mutation({
      query: (body) => ({
        url: "/api/admin/time-slots/block",
        method: "POST",
        body,
      }),
      invalidatesTags: ["BlockedSlot", "SlotStatus"],
    }),
    unblockTimeSlots: builder.mutation({
      query: (body) => ({
        url: "/api/admin/time-slots/unblock",
        method: "POST",
        body,
      }),
      invalidatesTags: ["BlockedSlot", "SlotStatus"],
    }),

    // --- Dynamic Banners ---
    getBanners: builder.query({
      query: () => "/api/banners",
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: ["Banner"],
    }),
    getBanner: builder.query({
      query: (id) => `/api/banners/${id}`,
      transformResponse: (response) => response?.data || response,
      providesTags: (result, error, id) => [{ type: "Banner", id }],
    }),
    createBanner: builder.mutation({
      query: (body) => ({
        url: "/api/banners",
        method: "POST",
        body,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
      invalidatesTags: ["Banner"],
    }),
    updateBanner: builder.mutation({
      query: ({ id, body }) => {
        // With a new image we must send multipart via POST + _method=PUT
        if (body instanceof FormData) {
          body.append("_method", "PUT");
          return {
            url: `/api/banners/${id}`,
            method: "POST",
            body,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          };
        }
        return {
          url: `/api/banners/${id}`,
          method: "PUT",
          body,
        };
      },
      invalidatesTags: ["Banner"],
    }),
    deleteBanner: builder.mutation({
      query: (id) => ({
        url: `/api/banners/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Banner"],
    }),
    toggleBanner: builder.mutation({
      query: (id) => ({
        url: `/api/banners/${id}/toggle`,
        method: "PATCH",
      }),
      invalidatesTags: ["Banner"],
    }),

    // --- Admin Settings: Closing Time ---
    getClosingTime: builder.query({
      query: () => "/api/admin/settings/closing-time",
      transformResponse: (response) => response?.data || response || {},
      providesTags: ["Setting"],
    }),
    updateClosingTime: builder.mutation({
      query: (body) => ({
        url: "/api/admin/settings/closing-time",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Setting"],
    }),

    // --- Workers Attendance ---
    getAttendance: builder.query({
      query: ({ page = 1 } = {}) => ({
        url: "/api/attendance",
        params: { page },
      }),
      transformResponse: (response) => response?.data || response || {},
      providesTags: ["Attendance"],
    }),
    getAttendanceWorkers: builder.query({
      query: ({ page = 1, city_id } = {}) => ({
        url: "/api/attendance/workers",
        params: { page, ...(city_id ? { city_id } : {}) },
      }),
      transformResponse: (response) => response?.data || response || {},
      providesTags: ["Attendance"],
    }),
    getWorkerAttendanceLogs: builder.query({
      query: ({ workerId, page = 1 } = {}) => ({
        url: `/api/attendance/worker/${workerId}`,
        params: { page },
      }),
      transformResponse: (response) => ({
        worker: response?.worker || null,
        paginator: response?.data || {},
      }),
      providesTags: (result, error, { workerId }) => [
        { type: "Attendance", id: workerId },
      ],
    }),

    // --- Marquee ---
    getMarquees: builder.query({
      query: () => "/api/admin/marquees",
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: ["Marquee"],
    }),
    createMarquee: builder.mutation({
      query: (body) => ({ url: "/api/admin/marquees", method: "POST", body }),
      invalidatesTags: ["Marquee"],
    }),
    updateMarquee: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/marquees/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Marquee"],
    }),
    deleteMarquee: builder.mutation({
      query: (id) => ({ url: `/api/admin/marquees/${id}`, method: "DELETE" }),
      invalidatesTags: ["Marquee"],
    }),

    // --- Home Categories ---
    getHomeCategories: builder.query({
      query: () => "/api/admin/home-categories",
      transformResponse: (response) => {
        const categories = Array.isArray(response)
          ? response
          : response?.data || [];

        return categories.map((category) => {
          const dosDonts = Array.isArray(category.dos_donts)
            ? category.dos_donts
            : [];

          const dos = Array.isArray(category.dos)
            ? category.dos
            : dosDonts
                .filter((item) => item.type === "do")
                .map((item) => item.text || "");

          const donts = Array.isArray(category.donts)
            ? category.donts
            : dosDonts
                .filter((item) => item.type === "dont")
                .map((item) => item.text || "");

          const images =
            Array.isArray(category.image_urls) && category.image_urls.length > 0
              ? category.image_urls.map((img) =>
                  typeof img === "string"
                    ? img
                    : img?.url ||
                      img?.image_url ||
                      img?.path ||
                      img?.image ||
                      "",
                )
              : Array.isArray(category.images)
                ? category.images
                : [];

          return {
            ...category,
            dos,
            donts,
            images,
          };
        });
      },
      providesTags: ["HomeCategory"],
    }),
    createHomeCategory: builder.mutation({
      query: (body) => ({
        url: "/api/admin/home-categories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["HomeCategory"],
    }),
    updateHomeCategory: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/home-categories/${id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["HomeCategory"],
    }),
    deleteHomeCategory: builder.mutation({
      query: (id) => ({
        url: `/api/admin/home-categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["HomeCategory"],
    }),

    // --- Office Location ---
    getOfficeLocation: builder.query({
      query: () => "/api/office-location",
      transformResponse: (response) => response?.data || response || {},
      providesTags: ["OfficeLocation"],
    }),
    updateOfficeLocation: builder.mutation({
      query: (body) => ({
        url: "/api/office-location",
        method: "POST",
        body,
      }),
      invalidatesTags: ["OfficeLocation"],
    }),

    // --- Service Plans ---
    getServicePlans: builder.query({
      query: (serviceId) => `/api/services/${serviceId}/plans`,
      transformResponse: (response) => response.data || response,
      providesTags: (result, error, serviceId) => [
        { type: "ServicePlan", id: serviceId },
      ],
    }),
    createServicePlan: builder.mutation({
      query: ({ serviceId, ...body }) => ({
        url: `/api/services/${serviceId}/plans`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { serviceId }) => [
        { type: "ServicePlan", id: serviceId },
      ],
    }),
    updateServicePlan: builder.mutation({
      query: ({ serviceId, planId, ...body }) => ({
        url: `/api/services/${serviceId}/plans/${planId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { serviceId }) => [
        { type: "ServicePlan", id: serviceId },
      ],
    }),
    deleteServicePlan: builder.mutation({
      query: ({ serviceId, planId }) => ({
        url: `/api/services/${serviceId}/plans/${planId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { serviceId }) => [
        { type: "ServicePlan", id: serviceId },
      ],
    }),
    getServicesWithPlans: builder.query({
      query: () => "/api/services-with-plans",
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: (result) => [
        { type: "ServicePlan", id: "LIST" },
        ...(result || []).map((s) => ({ type: "ServicePlan", id: s.id })),
      ],
    }),

    // --- Charges Settings ---
    getCharges: builder.query({
      query: () => "/api/settings/charges",
      transformResponse: (response) =>
        response.charges || response.data || response,
      providesTags: [{ type: "Setting", id: "charges" }],
    }),
    updateCharges: builder.mutation({
      query: (body) => ({
        url: "/api/admin/settings/charges",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Setting", id: "charges" }],
    }),

    // --- Referral Points Setting ---
    getReferralPoints: builder.query({
      query: () => "/api/admin/settings/referral-points",
      transformResponse: (response) => response.data || response,
      providesTags: [{ type: "Setting", id: "referral-points" }],
    }),
    updateReferralPoints: builder.mutation({
      query: (body) => ({
        url: "/api/admin/settings/referral-points",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Setting", id: "referral-points" }],
    }),

    // --- Extend Service Setting ---
    getExtendService: builder.query({
      query: () => "/api/admin/settings/extend",
      transformResponse: (response) =>
        response?.extend || response?.data || response,
      providesTags: [{ type: "Setting", id: "extend" }],
    }),
    updateExtendService: builder.mutation({
      query: (body) => ({
        url: "/api/admin/settings/extend",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Setting", id: "extend" }],
    }),

    // --- Instant Help Home Card (CMS) ---
    // Node backend manages many cards (/api/admin/instant-cards); this panel edits the "promo" card.
    getInstantCard: builder.query({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        const res = await baseQuery("/api/admin/instant-cards");
        if (res.error) return { error: res.error };
        const list = res.data?.data || [];
        const card =
          list.find((c) => (c.trigger_type || "promo") === "promo") ||
          list[0] ||
          null;
        return { data: card };
      },
      providesTags: [{ type: "Cms", id: "instant-card" }],
    }),
    saveInstantCard: builder.mutation({
      queryFn: async (formData, _api, _extra, baseQuery) => {
        const list = await baseQuery("/api/admin/instant-cards");
        if (list.error) return { error: list.error };
        const cards = list.data?.data || [];
        const card =
          cards.find((c) => (c.trigger_type || "promo") === "promo") ||
          cards[0];
        formData.set("trigger_type", "promo");
        return baseQuery({
          url: card
            ? `/api/admin/instant-cards/${card.id}`
            : "/api/admin/instant-cards",
          method: "POST",
          body: formData,
        });
      },
      invalidatesTags: [{ type: "Cms", id: "instant-card" }],
    }),
    toggleInstantCard: builder.mutation({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        const list = await baseQuery("/api/admin/instant-cards");
        if (list.error) return { error: list.error };
        const cards = list.data?.data || [];
        const card =
          cards.find((c) => (c.trigger_type || "promo") === "promo") ||
          cards[0];
        if (!card)
          return { error: { status: 404, data: { message: "No card to toggle" } } };
        return baseQuery({
          url: `/api/admin/instant-cards/${card.id}/toggle`,
          method: "PATCH",
        });
      },
      invalidatesTags: [{ type: "Cms", id: "instant-card" }],
    }),

    // --- Earn Banner (CMS) ---
    getEarnBanner: builder.query({
      query: () => "/api/cms/earn-banner",
      transformResponse: (response) => response.data || response,
      providesTags: [{ type: "Cms", id: "earn-banner" }],
    }),
    saveEarnBanner: builder.mutation({
      query: (formData) => {
        // PUT route; multipart requires POST + _method=PUT spoofing
        formData.append("_method", "POST");
        return {
          url: "/api/cms/earn-banner-save",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Cms", id: "earn-banner" }],
    }),

    // --- Savings Banner (CMS) ---
    getSavingsBanner: builder.query({
      query: () => "/api/cms/savings-banner",
      transformResponse: (response) => response.data || response,
      providesTags: [{ type: "Cms", id: "savings-banner" }],
    }),
    saveSavingsBanner: builder.mutation({
      query: (formData) => ({
        url: "/api/cms/savings-banner-save",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Cms", id: "savings-banner" }],
    }),
    getSubscriptionBenefits: builder.query({
      query: ({ type = "cleaner" } = {}) =>
        `/api/cms/subscription-benefits?type=${type}`,
      transformResponse: (response) => response.data || response,
      providesTags: (_result, _error, { type = "cleaner" }) => [
        { type: "Cms", id: `subscription-benefits-${type}` },
      ],
    }),
    bulkSaveSubscriptionBenefits: builder.mutation({
      query: ({ formData, type = "cleaner" }) => ({
        url: "/api/cms/subscription-benefits-bulk",
        method: "POST",
        body: formData,
        headers: { "X-Service-Type": type },
      }),
      invalidatesTags: (_result, _error, { type = "cleaner" }) => [
        { type: "Cms", id: `subscription-benefits-${type}` },
      ],
    }),
    deleteSubscriptionBenefit: builder.mutation({
      query: (id) => ({
        url: `/api/cms/subscription-benefits/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Cms", id: "LIST" }],
    }),

    // --- Why Choose (CMS App) ---
    getWhyChooseCms: builder.query({
      query: ({ type = "cleaner" } = {}) => `/api/cms/why-choose?type=${type}`,
      transformResponse: (response) => response.data || response,
      providesTags: (_result, _error, { type = "cleaner" }) => [
        { type: "Cms", id: `why-choose-${type}` },
      ],
    }),
    bulkSaveWhyChoose: builder.mutation({
      query: ({ formData, type = "cleaner" }) => ({
        url: "/api/cms/why-choose-bulk",
        method: "POST",
        body: formData,
        headers: { "X-Service-Type": type },
      }),
      invalidatesTags: (_result, _error, { type = "cleaner" }) => [
        { type: "Cms", id: `why-choose-${type}` },
      ],
    }),
    deleteWhyChooseCard: builder.mutation({
      query: (id) => ({
        url: `/api/cms/why-choose/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Cms", id: "LIST" }],
    }),

    // --- Subscription Policies (CMS) ---
    getSubscriptionPolicies: builder.query({
      query: ({ type = "cleaner" } = {}) =>
        `/api/cms/subscription-policies?type=${type}`,
      transformResponse: (response) => response.data || response,
      providesTags: (_result, _error, { type = "cleaner" }) => [
        { type: "Cms", id: `subscription-policies-${type}` },
      ],
    }),
    bulkSaveSubscriptionPolicies: builder.mutation({
      query: ({ body, type = "cleaner" }) => ({
        url: "/api/cms/subscription-policies-bulk",
        method: "POST",
        body: { ...body, type },
      }),
      invalidatesTags: (_result, _error, { type = "cleaner" }) => [
        { type: "Cms", id: `subscription-policies-${type}` },
      ],
    }),
    deleteSubscriptionPolicyPoint: builder.mutation({
      query: (id) => ({
        url: `/api/cms/subscription-policies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Cms", id: "LIST" }],
    }),

    // --- Booking Instructions (CMS) ---
    getBookingInstructions: builder.query({
      query: ({ subscriptionId } = {}) => ({
        url: "/api/cms/booking-instructions",
        params: subscriptionId ? { subscription_id: subscriptionId } : {},
      }),
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: [{ type: "Cms", id: "booking-instructions" }],
    }),
    createBookingInstruction: builder.mutation({
      query: (body) => ({
        url: "/api/cms/booking-instructions",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Cms", id: "booking-instructions" }],
    }),
    updateBookingInstruction: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/api/cms/booking-instructions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Cms", id: "booking-instructions" }],
    }),
    toggleBookingInstruction: builder.mutation({
      query: (id) => ({
        url: `/api/cms/booking-instructions/${id}/toggle`,
        method: "PATCH",
      }),
      invalidatesTags: [{ type: "Cms", id: "booking-instructions" }],
    }),
    deleteBookingInstruction: builder.mutation({
      query: (id) => ({
        url: `/api/cms/booking-instructions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Cms", id: "booking-instructions" }],
    }),

    // --- Campaigns / Push Notifications ---
    // Messages flow: draft -> sending -> sent. Drafts are editable; once sent
    // they become read-only delivery history.
    getCampaigns: builder.query({
      query: ({ status } = {}) => ({
        url: "/api/admin/campaigns",
        params: status && status !== "all" ? { status } : {},
      }),
      transformResponse: (response) =>
        Array.isArray(response) ? response : response?.data || [],
      providesTags: ["Campaign"],
    }),
    getCampaign: builder.query({
      query: (id) => `/api/admin/campaigns/${id}`,
      transformResponse: (response) => response?.data || response,
      providesTags: (result, error, id) => [{ type: "Campaign", id }],
    }),
    // Accepts a plain object (JSON, incl. image_url) or a FormData (file upload).
    createCampaign: builder.mutation({
      query: (body) => ({
        url: "/api/admin/campaigns",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Campaign"],
    }),
    // Draft-only. POST /update (not PUT) so multipart edits work server-side.
    updateCampaign: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/campaigns/${id}/update`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Campaign",
        { type: "Campaign", id },
      ],
    }),
    toggleCampaign: builder.mutation({
      query: (id) => ({
        url: `/api/admin/campaigns/${id}/toggle`,
        method: "PATCH",
      }),
      invalidatesTags: ["Campaign"],
    }),
    deleteCampaign: builder.mutation({
      query: (id) => ({
        url: `/api/admin/campaigns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Campaign"],
    }),
    // Standalone image upload -> returns { path, image_url }. Used for preview
    // so create/update/send can just carry an image_url string.
    uploadCampaignImage: builder.mutation({
      query: (body) => ({
        url: "/api/admin/campaigns/upload-image",
        method: "POST",
        body,
      }),
    }),
    // Queues the campaign. body: { segment, target_user_id?, image_url? }.
    sendCampaign: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/admin/campaigns/${id}/send`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        "Campaign",
        { type: "Campaign", id },
      ],
    }),
    getCampaignStatus: builder.query({
      query: (id) => `/api/admin/campaigns/${id}/status`,
      providesTags: (result, error, id) => [{ type: "Campaign", id }],
    }),
  }),
});

export const {
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
  useGetServiceCategoriesQuery,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  useDeleteServiceCategoryMutation,
  useGetServicesQuery,
  useGetServicesByCategoryQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useGetAddOnsQuery,
  useCreateAddOnMutation,
  useUpdateAddOnMutation,
  useDeleteAddOnMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useUpdateRolePermissionsMutation,
  useGetRoleQuery,
  useLazyGetRoleQuery,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserProfileQuery,
  useGetSubscriptionTypesQuery,
  useCreateSubscriptionTypeMutation,
  useUpdateSubscriptionTypeMutation,
  useDeleteSubscriptionTypeMutation,
  useGetCommissionsQuery,
  useGetCommissionSummaryQuery,
  useCreateCommissionMutation,
  useUpdateCommissionMutation,
  useDeleteCommissionMutation,
  useLoginMutation,
  useRegisterMutation,
  useSendForgotPasswordOtpMutation,
  useResetPasswordMutation,
  useGetDeleteAccountRequestsQuery,
  useApproveDeleteAccountRequestMutation,
  useRejectDeleteAccountRequestMutation,
  useGetWorkersQuery,
  useGetWorkersPaginatedQuery,
  useCreateWorkerMutation,
  useUpdateWorkerMutation,
  useDeleteWorkerMutation,
  useRegisterWorkerMutation,
  useUploadWorkerKycMutation,
  useUploadWorkerDocsMutation,
  useInitializeWorkerKycMutation,
  useLazyGetWorkerKycStatusQuery,
  useApproveWorkerKycMutation,
  useRejectWorkerKycMutation,
  useGetUnassignedWorkersQuery,
  useGetPreviousBookingWorkersQuery,
  useAssignBookingMutation,
  useReassignBookingMutation,
  useUpdateWorkerLocationMutation,
  useGetAllBookingsQuery,
  useGetCancellationRequestsQuery,
  useApproveCancellationRequestMutation,
  useRejectCancellationRequestMutation,
  useExportBookingsReportMutation,
  useGetCoordinatorsQuery,
  useAssignCoordinatorMutation,
  useReassignCoordinatorMutation,
  useGetWhatsappCoordinatorsMutation,
  useSendBookingToWhatsappCoordinatorMutation,
  useGetInstantBookingExtensionsQuery,
  useGetRescheduleHistoryQuery,
  useGetWorkerBankDetailsByIdQuery,
  useGetCustomersQuery,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useGetAlertsQuery,
  useMarkAlertsReadMutation,
  useGetServiceEndAlertsQuery,
  useMarkServiceEndAlertReadMutation,
  useMarkAllServiceEndAlertsReadMutation,
  useGetEmergencyAlertsQuery,
  useGetEmergencyAlertQuery,
  useAcknowledgeEmergencyAlertMutation,
  useResolveEmergencyAlertMutation,
  useGetOverviewQuery,
  useUpdateBookingStatusMutation,
  useUpdateBookingMutation,
  usePauseBookingSubscriptionMutation,
  useGetPauseHistoryQuery,
  useSendPaymentLinkMutation,
  useSendBothOtpMutation,
  useUpdateWorkerBankByIdMutation,
  /*
  useSendStartOtpMutation,
  useSendCloseOtpMutation,
  */
  useCreateResidentSurveyMutation,
  useGetResidentSurveysQuery,
  useCreateMaidSurveyMutation,
  useGetMaidSurveysQuery,
  useGetWorkerMeQuery,
  useWithdrawWorkerMutation,
  useGetWithdrawalsQuery,
  useApproveWithdrawalMutation,
  useRejectWithdrawalMutation,
  useGetTransactionsQuery,
  useExportTransactionsReportMutation,
  useGetReferralsQuery,
  useGetReferralLinkQuery,
  useGetAllRatingsQuery,
  useGetAvgRatingsQuery,
  useGetWorkerBookingsQuery,
  useGetReferrersDropdownQuery,
  useGetDontsQuery,
  useGetAllServiceDontsQuery,
  useGetServiceDontsQuery,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useCreateDontMutation,
  useUpdateDontMutation,
  useDeleteDontMutation,
  useGetContractorsQuery,
  useGetContractorDetailsQuery,
  useGetPincodesQuery,
  useCreatePincodeMutation,
  useUpdatePincodeMutation,
  useDeletePincodeMutation,
  useGetCmsContentQuery,
  useGetEventsQuery,
  useCreateEventMutation,
  useDeleteEventMutation,
  useGetEnquiriesQuery,
  useCreateEnquiryMutation,
  useUpdateEnquiryMutation,
  useDeleteEnquiryMutation,
  useGetDeepCleaningEnquiriesQuery,
  useGetServiceRequestsQuery,
  useUpdateServiceRequestStatusMutation,
  useGetTimeSlotsQuery,
  useGetTimeSlotQuery,
  useCreateTimeSlotMutation,
  useCreateBulkTimeSlotsMutation,
  useUpdateTimeSlotMutation,
  useDeleteTimeSlotMutation,
  useRestoreTimeSlotMutation,
  useGetBlockedSlotsQuery,
  useGetSlotStatusQuery,
  useBlockTimeSlotsMutation,
  useUnblockTimeSlotsMutation,
  useGetBannersQuery,
  useGetBannerQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useToggleBannerMutation,
  useGetMarqueesQuery,
  useCreateMarqueeMutation,
  useUpdateMarqueeMutation,
  useDeleteMarqueeMutation,
  useGetHomeCategoriesQuery,
  useCreateHomeCategoryMutation,
  useUpdateHomeCategoryMutation,
  useDeleteHomeCategoryMutation,
  useGetClosingTimeQuery,
  useUpdateClosingTimeMutation,
  useGetOfficeLocationQuery,
  useUpdateOfficeLocationMutation,
  useGetAttendanceQuery,
  useGetAttendanceWorkersQuery,
  useGetWorkerAttendanceLogsQuery,
  useGetServicePlansQuery,
  useCreateServicePlanMutation,
  useUpdateServicePlanMutation,
  useDeleteServicePlanMutation,
  useGetServicesWithPlansQuery,
  useGetChargesQuery,
  useUpdateChargesMutation,
  useGetReferralPointsQuery,
  useUpdateReferralPointsMutation,
  useGetExtendServiceQuery,
  useUpdateExtendServiceMutation,
  useGetInstantCardQuery,
  useSaveInstantCardMutation,
  useToggleInstantCardMutation,
  useGetEarnBannerQuery,
  useSaveEarnBannerMutation,
  useGetSavingsBannerQuery,
  useSaveSavingsBannerMutation,
  useGetSubscriptionBenefitsQuery,
  useBulkSaveSubscriptionBenefitsMutation,
  useDeleteSubscriptionBenefitMutation,
  useGetWhyChooseCmsQuery,
  useBulkSaveWhyChooseMutation,
  useDeleteWhyChooseCardMutation,
  useGetSubscriptionPoliciesQuery,
  useBulkSaveSubscriptionPoliciesMutation,
  useDeleteSubscriptionPolicyPointMutation,
  useGetBookingInstructionsQuery,
  useCreateBookingInstructionMutation,
  useUpdateBookingInstructionMutation,
  useToggleBookingInstructionMutation,
  useDeleteBookingInstructionMutation,
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useLazyGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useToggleCampaignMutation,
  useDeleteCampaignMutation,
  useUploadCampaignImageMutation,
  useSendCampaignMutation,
  useGetCampaignStatusQuery,
} = apiSlice;
