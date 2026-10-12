import React, { useState, useEffect, startTransition } from "react";
import {
  Bell,
  Lock,
  Globe,
  CreditCard,
  Save,
  Mail,
  Smartphone,
  Shield,
  Eye,
  EyeOff,
  FileText,
  Copy,
  ExternalLink,
  Clock,
  MapPin,
  Gift,
  CalendarClock,
  Percent,
  IndianRupee,
  Timer,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useGetClosingTimeQuery,
  useUpdateClosingTimeMutation,
  useGetOfficeLocationQuery,
  useUpdateOfficeLocationMutation,
  useGetReferralPointsQuery,
  useUpdateReferralPointsMutation,
  useGetChargesQuery,
  useUpdateChargesMutation,
  useGetExtendServiceQuery,
  useUpdateExtendServiceMutation,
} from "../../api/apiSlice";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "general",
  );
  const [showPassword, setShowPassword] = useState(false);

  // --- Closing Time ---
  const { data: closingTimeData } = useGetClosingTimeQuery();
  const [updateClosingTime, { isLoading: isSavingClosingTime }] =
    useUpdateClosingTimeMutation();
  const [closingTime, setClosingTime] = useState("");

  // --- Referral Points ---
  const { data: referralPointsData } = useGetReferralPointsQuery();
  const [updateReferralPoints, { isLoading: isSavingReferralPoints }] =
    useUpdateReferralPointsMutation();
  const [referralPoints, setReferralPoints] = useState("");

  // --- Charges ---
  const { data: chargesData } = useGetChargesQuery();
  const [updateCharges, { isLoading: isSavingCharges }] =
    useUpdateChargesMutation();
  const [charges, setCharges] = useState({
    platform_fee: "",
    travelling_charge: "",
    gst_percent: "",
    rain_charge: "",
    subscription_fee: "",
  });

  useEffect(() => {
    if (chargesData) {
      startTransition(() =>
        setCharges({
          platform_fee: chargesData.platform_fee ?? "",
          travelling_charge: chargesData.travelling_charge ?? "",
          gst_percent: chargesData.gst_percent ?? "",
          rain_charge: chargesData.rain_charge ?? "",
          subscription_fee: chargesData.subscription_fee ?? "",
        }),
      );
    }
  }, [chargesData]);

  // --- Extend Service ---
  const { data: extendServiceData } = useGetExtendServiceQuery();
  const [updateExtendService, { isLoading: isSavingExtendService }] =
    useUpdateExtendServiceMutation();
  const [extendService, setExtendService] = useState({
    extend_duration_minutes: "",
    extend_price: "",
  });

  useEffect(() => {
    if (extendServiceData) {
      startTransition(() =>
        setExtendService({
          extend_duration_minutes:
            extendServiceData.extend_duration_minutes ?? "",
          extend_price: extendServiceData.extend_price ?? "",
        }),
      );
    }
  }, [extendServiceData]);

  // --- Office Location ---
  const { data: officeLocationData } = useGetOfficeLocationQuery();
  const [updateOfficeLocation, { isLoading: isSavingOfficeLocation }] =
    useUpdateOfficeLocationMutation();
  const [officeLocation, setOfficeLocation] = useState({
    latitude: "",
    longitude: "",
    radius_m: "",
  });

  useEffect(() => {
    if (referralPointsData?.points != null) {
      startTransition(() =>
        setReferralPoints(String(referralPointsData.points)),
      );
    }
  }, [referralPointsData]);

  useEffect(() => {
    if (closingTimeData?.closing_time != null) {
      startTransition(() => setClosingTime(closingTimeData.closing_time));
    }
  }, [closingTimeData]);

  useEffect(() => {
    if (officeLocationData) {
      startTransition(() =>
        setOfficeLocation({
          latitude: officeLocationData.latitude ?? "",
          longitude: officeLocationData.longitude ?? "",
          radius_m: officeLocationData.radius_m ?? "",
        }),
      );
    }
  }, [officeLocationData]);

  // Mock State for Settings
  const [settings, setSettings] = useState({
    general: {
      appName: "Hobit Admin",
      supportEmail: "support@hobit.com",
      currency: "INR",
      language: "English",
      timezone: "Asia/Kolkata",
    },
    notifications: {
      emailOrderUpdates: true,
      emailPromotions: false,
      smsOrderUpdates: true,
      smsPromotions: true,
      pushNewOrders: true,
      pushMessages: true,
    },
    security: {
      twoFactorAuth: false,
      passwordExpiry: "90",
      sessionTimeout: "30",
    },
    payment: {
      stripeEnabled: true,
      paypalEnabled: false,
      razorpayEnabled: true,
      codEnabled: true,
    },
  });

  const handleGeneralChange = (e) => {
    setSettings({
      ...settings,
      general: { ...settings.general, [e.target.name]: e.target.value },
    });
  };

  const handleNotificationToggle = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const handleSecurityChange = (e) => {
    setSettings({
      ...settings,
      security: { ...settings.security, [e.target.name]: e.target.value },
    });
  };

  const handleSecurityToggle = (key) => {
    setSettings({
      ...settings,
      security: {
        ...settings.security,
        [key]: !settings.security[key],
      },
    });
  };

  const handlePaymentToggle = (key) => {
    setSettings({
      ...settings,
      payment: {
        ...settings.payment,
        [key]: !settings.payment[key],
      },
    });
  };

  const handleSave = async () => {
    try {
      if (activeTab === "referral-points") {
        const pts = Number(referralPoints);
        if (!referralPoints || isNaN(pts) || pts < 0) {
          toast.error("Please enter a valid points value");
          return;
        }
        await updateReferralPoints({ points: pts }).unwrap();
        toast.success("Referral points updated successfully");
        return;
      }

      if (activeTab === "closing-time") {
        if (!closingTime) {
          toast.error("Please set a closing time");
          return;
        }
        await updateClosingTime({ closing_time: closingTime }).unwrap();
        toast.success("Closing time updated successfully");
        return;
      }

      if (activeTab === "office-location") {
        await updateOfficeLocation({
          latitude: Number(officeLocation.latitude),
          longitude: Number(officeLocation.longitude),
          radius_m: Number(officeLocation.radius_m),
        }).unwrap();
        toast.success("Office location updated successfully");
        return;
      }

      if (activeTab === "charges") {
        await updateCharges({
          platform_fee: Number(charges.platform_fee),
          travelling_charge: Number(charges.travelling_charge),
          gst_percent: Number(charges.gst_percent),
          rain_charge: Number(charges.rain_charge),
          subscription_fee: Number(charges.subscription_fee),
        }).unwrap();
        toast.success("Charges updated successfully");
        return;
      }

      if (activeTab === "extend-service") {
        const durationMinutes = Number(extendService.extend_duration_minutes);
        const price = Number(extendService.extend_price);
        if (!extendService.extend_duration_minutes || durationMinutes <= 0) {
          toast.error("Please enter a valid extend duration");
          return;
        }
        if (extendService.extend_price === "" || isNaN(price) || price < 0) {
          toast.error("Please enter a valid extend price");
          return;
        }
        await updateExtendService({
          extend_duration_minutes: durationMinutes,
          extend_price: price,
        }).unwrap();
        toast.success("Extend service settings updated successfully");
        return;
      }

      // General/other tabs are not yet wired to a backend.
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save settings");
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Globe },
    { id: "closing-time", label: "Closing Time", icon: Clock },
    { id: "office-location", label: "Office Location", icon: MapPin },
    { id: "referral-points", label: "Referral Points", icon: Gift },
    { id: "charges", label: "Charges", icon: IndianRupee },
    { id: "extend-service", label: "Extend Service", icon: Timer },
    {
      id: "slot-management",
      label: "Slot Management",
      icon: CalendarClock,
      link: "/slot-management",
    },
    // { id: "notifications", label: "Notifications", icon: Bell },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your application preferences and configurations
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={
            isSavingClosingTime ||
            isSavingOfficeLocation ||
            isSavingReferralPoints ||
            isSavingCharges ||
            isSavingExtendService
          }
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isSavingClosingTime ||
          isSavingOfficeLocation ||
          isSavingReferralPoints ||
          isSavingCharges ||
          isSavingExtendService
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <nav className="flex flex-col p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.link) navigate(tab.link);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                    {tab.link && (
                      <ExternalLink
                        size={13}
                        className="ml-auto text-gray-400"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  General Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      name="appName"
                      value={settings.general.appName}
                      onChange={handleGeneralChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      name="supportEmail"
                      value={settings.general.supportEmail}
                      onChange={handleGeneralChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "closing-time" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Closing Time
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Set the daily closing time after which bookings are no
                    longer accepted.
                  </p>
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    24-hour format (e.g. 18:00).
                  </p>
                </div>
              </div>
            )}

            {activeTab === "office-location" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Office Location
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Set the office coordinates and the allowed radius for
                    location-based checks.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={officeLocation.latitude}
                      onChange={(e) =>
                        setOfficeLocation((prev) => ({
                          ...prev,
                          latitude: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. 20.006399"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={officeLocation.longitude}
                      onChange={(e) =>
                        setOfficeLocation((prev) => ({
                          ...prev,
                          longitude: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. 73.769035"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Radius (meters)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={officeLocation.radius_m}
                      onChange={(e) =>
                        setOfficeLocation((prev) => ({
                          ...prev,
                          radius_m: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g. 200"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "referral-points" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Referral Points
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Points awarded to a user when they successfully refer
                    someone. Requires super-admin access to update.
                  </p>
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points per Referral
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={referralPoints}
                      onChange={(e) => setReferralPoints(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <Gift size={18} className="text-gray-400 shrink-0" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter a whole number (e.g. 25).
                  </p>
                </div>
              </div>
            )}

            {activeTab === "charges" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Charges</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure platform fees, GST, and surcharges applied to
                    bookings.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      key: "platform_fee",
                      label: "Platform Fee",
                      isPercent: false,
                      placeholder: "e.g. 20",
                    },
                    {
                      key: "travelling_charge",
                      label: "Travelling Charge",
                      isPercent: false,
                      placeholder: "e.g. 0",
                    },
                    {
                      key: "subscription_fee",
                      label: "Subscription Fee",
                      isPercent: false,
                      placeholder: "e.g. 1",
                    },
                    {
                      key: "gst_percent",
                      label: "GST (%)",
                      isPercent: true,
                      placeholder: "e.g. 18",
                    },
                    {
                      key: "rain_charge",
                      label: "Rain Charge",
                      isPercent: false,
                      placeholder: "e.g. 50",
                    },
                  ].map(({ key, label, isPercent, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {isPercent ? (
                            <Percent size={15} />
                          ) : (
                            <IndianRupee size={15} />
                          )}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={charges[key]}
                          onChange={(e) =>
                            setCharges((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={placeholder}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "extend-service" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Extend Service
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure the duration and price customers are charged
                    when they extend an ongoing service.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Extend Duration (Minutes)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Timer size={15} />
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={extendService.extend_duration_minutes}
                        onChange={(e) =>
                          setExtendService((prev) => ({
                            ...prev,
                            extend_duration_minutes: e.target.value,
                          }))
                        }
                        placeholder="e.g. 30"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Extend Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <IndianRupee size={15} />
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={extendService.extend_price}
                        onChange={(e) =>
                          setExtendService((prev) => ({
                            ...prev,
                            extend_price: e.target.value,
                          }))
                        }
                        placeholder="e.g. 200"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Notification Preferences
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <Mail size={16} /> Email Notifications
                    </h3>
                    <div className="space-y-3 pl-6">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600">
                          Order Updates
                        </span>
                        <div
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            settings.notifications.emailOrderUpdates
                              ? "bg-primary"
                              : "bg-gray-200"
                          }`}
                          onClick={() =>
                            handleNotificationToggle("emailOrderUpdates")
                          }
                        >
                          <div
                            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              settings.notifications.emailOrderUpdates
                                ? "translate-x-5"
                                : ""
                            }`}
                          />
                        </div>
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        {/* <span className="text-sm text-gray-600">
                          Promotional Emails
                        </span> */}
                        {/* <div
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            settings.notifications.emailPromotions
                              ? "bg-primary"
                              : "bg-gray-200"
                          }`}
                          onClick={() =>
                            handleNotificationToggle("emailPromotions")
                          }
                        >
                          <div
                            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              settings.notifications.emailPromotions
                                ? "translate-x-5"
                                : ""
                            }`}
                          />
                        </div> */}
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <Smartphone size={16} /> Push Notifications
                    </h3>
                    <div className="space-y-3 pl-6">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600">
                          New Orders
                        </span>
                        <div
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            settings.notifications.pushNewOrders
                              ? "bg-primary"
                              : "bg-gray-200"
                          }`}
                          onClick={() =>
                            handleNotificationToggle("pushNewOrders")
                          }
                        >
                          <div
                            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              settings.notifications.pushNewOrders
                                ? "translate-x-5"
                                : ""
                            }`}
                          />
                        </div>
                      </label>
                      {/* <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-gray-600">Messages</span>
                        <div
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            settings.notifications.pushMessages
                              ? "bg-primary"
                              : "bg-gray-200"
                          }`}
                          onClick={() =>
                            handleNotificationToggle("pushMessages")
                          }
                        >
                          <div
                            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              settings.notifications.pushMessages
                                ? "translate-x-5"
                                : ""
                            }`}
                          />
                        </div>
                      </label> */}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Security Settings
                </h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <Shield size={16} /> Authentication
                    </h3>
                    <div className="pl-6 space-y-4">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Two-Factor Authentication (2FA)
                          </div>
                          <div className="text-xs text-gray-500">
                            Add an extra layer of security to your account
                          </div>
                        </div>
                        <div
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            settings.security.twoFactorAuth
                              ? "bg-primary"
                              : "bg-gray-200"
                          }`}
                          onClick={() => handleSecurityToggle("twoFactorAuth")}
                        >
                          <div
                            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              settings.security.twoFactorAuth
                                ? "translate-x-5"
                                : ""
                            }`}
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <Lock size={16} /> Password Policy
                    </h3>
                    <div className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password Expiry (Days)
                        </label>
                        <input
                          type="number"
                          name="passwordExpiry"
                          value={settings.security.passwordExpiry}
                          onChange={handleSecurityChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Session Timeout (Minutes)
                        </label>
                        <input
                          type="number"
                          name="sessionTimeout"
                          value={settings.security.sessionTimeout}
                          onChange={handleSecurityChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Payment Methods
                </h2>
                <div className="space-y-4">
                  {Object.entries(settings.payment).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          <CreditCard size={20} className="text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {key
                              .replace("Enabled", "")
                              .replace(/([A-Z])/g, " $1")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {value ? "Enabled" : "Disabled"}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                          value ? "bg-primary" : "bg-gray-200"
                        }`}
                        onClick={() => handlePaymentToggle(key)}
                      >
                        <div
                          className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                            value ? "translate-x-5" : ""
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
