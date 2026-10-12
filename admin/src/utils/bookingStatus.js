// Tailwind badge styles for booking status.
export const getStatusColor = (status) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-50 text-yellow-700 border-yellow-100";
    case "Assigned":
      return "bg-blue-50 text-blue-700 border-blue-100";
    case "Inprogress":
    case "In Progress":
      return "bg-indigo-50 text-indigo-700 border-indigo-100";
    case "Completed":
      return "bg-green-50 text-green-700 border-green-100";
    case "Cancelled":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-gray-50 text-gray-700 border-gray-100";
  }
};

// Tailwind badge styles for payment status.
export const getPaymentStatusColor = (status) => {
  if (!status) return "bg-gray-50 text-gray-700 border-gray-100";

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "paid") {
    return "bg-green-50 text-green-700 border-green-100";
  }
  if (normalizedStatus === "unpaid" || normalizedStatus === "due") {
    return "bg-red-50 text-red-700 border-red-100";
  }
  if (normalizedStatus === "rejected" || normalizedStatus === "failed") {
    return "bg-red-50 text-red-700 border-red-100";
  }
  if (normalizedStatus === "payment_pending" || normalizedStatus === "pending") {
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }
  return "bg-gray-50 text-gray-700 border-gray-100";
};

// Deterministic Tailwind badge styles for a service category, hashed by name.
export const getCategoryBadgeStyles = (category) => {
  if (!category) {
    return "bg-gray-50 text-gray-700 border-gray-100";
  }

  const normalized = category.trim().toLowerCase();

  // Monthly cook categories are called out in red regardless of the hash.
  if (normalized.startsWith("monthly cook")) {
    return "bg-red-50 text-red-700 border-red-100";
  }

  const palette = [
    "bg-blue-50 text-blue-700 border-blue-100",
    "bg-cyan-50 text-cyan-700 border-cyan-100",
    "bg-yellow-50 text-yellow-700 border-yellow-100",
    "bg-amber-50 text-amber-700 border-amber-100",
    "bg-emerald-50 text-emerald-700 border-emerald-100",
    "bg-pink-50 text-pink-700 border-pink-100",
    "bg-violet-50 text-violet-700 border-violet-100",
    "bg-sky-50 text-sky-700 border-sky-100",
    "bg-rose-50 text-rose-700 border-rose-100",
    "bg-lime-50 text-lime-700 border-lime-100",
  ];

  const hash = [...normalized].reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  return palette[hash % palette.length];
};
