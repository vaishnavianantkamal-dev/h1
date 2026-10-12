import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Siren, X, ChevronRight } from "lucide-react";
import { useGetEmergencyAlertsQuery } from "../api/apiSlice";
import { ROLES } from "../constants/roles";

const POLL_INTERVAL_MS = 30000;
const SOS_SOUND_SRC = "/sos.mp3";
const LAST_SEEN_MAX_ID_KEY = "sosLastSeenMaxId";

const canSeeAlerts = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = typeof user?.role === "object" ? user.role?.name : user?.role;
    return (
      role === ROLES.SUPER_ADMIN ||
      (Array.isArray(user?.permissions) &&
        user.permissions.includes("emergency_alerts"))
    );
  } catch {
    return false;
  }
};

const SosAlertBanner = () => {
  const location = useLocation();
  const [dismissedMaxId, setDismissedMaxId] = useState(() =>
    Number(sessionStorage.getItem("sosDismissedMaxId") || 0),
  );
  const audioRef = useRef(null);
  if (audioRef.current === null) {
    audioRef.current = new Audio(SOS_SOUND_SRC);
  }
  const lastSeenMaxIdRef = useRef(null);
  if (lastSeenMaxIdRef.current === null) {
    lastSeenMaxIdRef.current = Number(
      sessionStorage.getItem(LAST_SEEN_MAX_ID_KEY) || 0,
    );
  }

  const { data: response } = useGetEmergencyAlertsQuery(
    { page: 1 },
    { pollingInterval: POLL_INTERVAL_MS, skip: !canSeeAlerts() },
  );

  const paginator =
    response?.data && !Array.isArray(response.data) ? response.data : response;
  const alerts = Array.isArray(paginator?.data)
    ? paginator.data
    : Array.isArray(response?.data)
      ? response.data
      : [];

  const openAlerts = alerts.filter((a) => {
    const status = (a?.status || "pending").toLowerCase();
    return status !== "resolved" && status !== "acknowledged";
  });

  const maxId = openAlerts.length
    ? Math.max(...openAlerts.map((a) => Number(a.id) || 0))
    : 0;

  // Play the SOS sound whenever a new (previously unseen) open alert appears —
  // covers both alerts that arrived while browsing and ones already pending on load.
  useEffect(() => {
    if (maxId > 0 && maxId > lastSeenMaxIdRef.current) {
      lastSeenMaxIdRef.current = maxId;
      sessionStorage.setItem(LAST_SEEN_MAX_ID_KEY, String(maxId));
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [maxId]);

  if (openAlerts.length === 0) return null;

  // Stay hidden after dismissal until a NEW alert arrives
  if (maxId <= dismissedMaxId) return null;

  const latest = openAlerts.reduce(
    (acc, a) => ((Number(a.id) || 0) >= (Number(acc.id) || 0) ? a : acc),
    openAlerts[0],
  );
  const workerName =
    latest?.worker?.name ||
    latest?.worker_name ||
    (latest?.worker_id ? `Worker #${latest.worker_id}` : "A worker");

  const handleDismiss = () => {
    sessionStorage.setItem("sosDismissedMaxId", String(maxId));
    setDismissedMaxId(maxId);
  };

  return (
    <div className="bg-red-600 text-white px-4 sm:px-6 py-2.5 flex items-center gap-3 shadow-md relative z-30">
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 animate-ping" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Siren size={17} />
        </span>
      </span>
      <div className="flex-1 min-w-0 text-sm">
        <span className="font-bold uppercase tracking-wide mr-2">
          SOS Alert{openAlerts.length > 1 ? `s (${openAlerts.length})` : ""}
        </span>
        <span className="text-white/90 truncate">
          {workerName} raised a{" "}
          <span className="font-semibold capitalize">
            {latest?.alert_type || "safety"}
          </span>{" "}
          alert
          {latest?.message ? ` — “${latest.message}”` : ""}
        </span>
      </div>
      {location.pathname !== "/emergency-alerts" && (
        <Link
          to="/emergency-alerts"
          className="shrink-0 flex items-center gap-1 bg-white text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          View
          <ChevronRight size={14} />
        </Link>
      )}
      <button
        onClick={handleDismiss}
        title="Dismiss until a new alert arrives"
        className="shrink-0 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default SosAlertBanner;
