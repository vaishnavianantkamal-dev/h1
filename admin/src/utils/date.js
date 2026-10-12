import { format } from "date-fns";

// Normalize any date string to yyyy-mm-dd for HTML date inputs.
// Handles: yyyy-mm-dd (pass-through), dd-mm-yyyy (backend legacy)
export const toInputDate = (str) => {
  if (!str || str === "N/A") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split("-");
  if (parts.length === 3 && parts[0].length === 2) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return str;
};

export const formatDateTime12 = (dateTimeStr) => {
  if (!dateTimeStr || dateTimeStr === "N/A") return "N/A";
  try {
    // If it's a full timestamp like "2026-03-26 18:16:28"
    const date = new Date(dateTimeStr.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return dateTimeStr;
    return format(date, "yyyy-MM-dd hh:mm a");
  } catch {
    return dateTimeStr;
  }
};
