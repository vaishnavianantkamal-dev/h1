// True when a notification/alert has not been read yet (handles multiple backend shapes).
export const isAlertUnread = (alert) =>
  alert?.is_read === 0 || alert?.is_read === false || alert?.is_read === "0";

// Classify a service reminder as "starting" or "ending" from its type/title/message.
// Defaults to "ending" when the signal is ambiguous.
export const getReminderType = (alert) => {
  const typeValue = String(alert?.data?.type || "").toLowerCase();
  const titleMessage = `${String(alert?.title || "").toLowerCase()} ${String(
    alert?.message || "",
  ).toLowerCase()}`;

  if (typeValue.includes("start") || titleMessage.includes("start")) {
    return "starting";
  }
  if (typeValue.includes("end") || titleMessage.includes("end")) {
    return "ending";
  }
  return "ending";
};

// Reminders arrive from two backends whose ids are independent sequences, so
// every alert carries the feed it came from to keep ids and mark-read distinct.
export const ALERT_SOURCE_GENERAL = "alerts";
export const ALERT_SOURCE_SERVICE_END = "service-end";

export const withAlertSource = (alerts, source) =>
  (Array.isArray(alerts) ? alerts : []).map((alert) => ({
    ...alert,
    _source: source,
  }));

// Stable React key / identity across both feeds.
export const getAlertKey = (alert) =>
  `${alert?._source || ALERT_SOURCE_GENERAL}-${alert?.id}`;

export const isServiceEndAlert = (alert) =>
  alert?._source === ALERT_SOURCE_SERVICE_END;
