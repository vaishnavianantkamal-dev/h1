// Shared config for the Notifications (push campaigns) feature.

// Audience segments understood by the /send + create endpoints.
export const SEGMENTS = [
  { value: "all_customers", label: "All Customers" },
  { value: "all_workers", label: "All Workers" },
  { value: "all", label: "Everyone" },
  { value: "single_user", label: "Single User" },
];

export const segmentLabel = (value) =>
  SEGMENTS.find((s) => s.value === value)?.label || value || "—";

// Preset categories (dropdown) — admin can also type a custom one.
export const CATEGORY_PRESETS = [
  "offers",
  "cook",
  "general",
  "update",
  "promotion",
  "reminder",
];

// Delivery status → badge styling + label.
export const STATUS_META = {
  draft: {
    label: "Draft",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
  sending: {
    label: "Sending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  sent: {
    label: "Sent",
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
};

export const statusMeta = (status) =>
  STATUS_META[status] || {
    label: status || "—",
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  };

// Status filter tabs shown above the grid.
export const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sending", label: "Sending" },
  { value: "sent", label: "Sent" },
];

export const isActiveFlag = (v) => v === true || v === 1 || v === "1";
