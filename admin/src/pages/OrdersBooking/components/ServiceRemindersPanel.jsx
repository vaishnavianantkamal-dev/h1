import React from "react";
import { Bell, Check, Calendar, MapPin } from "lucide-react";
import { formatDateTime12 } from "../../../utils/date";
import {
  isAlertUnread,
  getReminderType,
  getAlertKey,
} from "../../../utils/alerts";

const ReminderCard = ({ alert, fallbackTitle, onMarkSingle, isMarking }) => {
  const unread = isAlertUnread(alert);
  return (
    <li
      className={`relative rounded-xl border p-3 transition-all hover:shadow-md ${
        unread
          ? "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/40"
          : "border-gray-100 bg-white"
      }`}
    >
      {/* Top row: booking id + mark-read action */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {alert.booking_id != null && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-mono font-bold">
              #{alert.booking_id}
            </span>
          )}
          {unread && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </div>
        {unread && (
          <button
            type="button"
            onClick={() => onMarkSingle(alert)}
            disabled={isMarking}
            title="Mark as read"
            className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-primary bg-white hover:bg-blue-100 border border-blue-200 disabled:opacity-60 transition-all"
          >
            <Check size={12} />
          </button>
        )}
      </div>

      {/* Message */}
      <h3
        className="text-gray-900 font-semibold leading-snug text-sm mb-2"
        title={alert.title || alert.message}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {alert.title || fallbackTitle}
      </h3>
      <p
        className="text-gray-700 text-[12px] leading-snug mb-2"
        title={alert.message}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {alert.message}
      </p>

      {alert.created_at && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 mb-2">
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} className="text-gray-400" />
            {formatDateTime12(alert.created_at)}
          </span>
          {alert.data?.type && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {alert.data.type}
            </span>
          )}
        </div>
      )}

      {alert.address && (
        <div className="flex items-start gap-1 text-[11px] text-gray-500">
          <MapPin size={11} className="shrink-0 mt-0.5 text-gray-400" />
          <span
            className="break-words"
            title={alert.address}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {alert.address}
          </span>
        </div>
      )}

      {alert.created_at && !alert.city_id && !alert.address && (
        <p className="text-[9px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
          {formatDateTime12(alert.created_at)}
        </p>
      )}
    </li>
  );
};

const RemindersGroup = ({
  heading,
  emptyText,
  fallbackTitle,
  alerts,
  onMarkSingle,
  onMarkAll,
  isMarking,
}) => (
  <div>
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{heading}</h3>
        <p className="text-[11px] text-slate-500">
          {alerts.length} unread reminder{alerts.length === 1 ? "" : "s"}
        </p>
      </div>
      {alerts.length > 0 && (
        <button
          type="button"
          onClick={onMarkAll}
          disabled={isMarking}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-white hover:bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 disabled:opacity-60 transition-all shadow-sm shrink-0"
        >
          {isMarking ? (
            <div className="w-3 h-3 border-2 border-blue-200 border-t-primary rounded-full animate-spin" />
          ) : (
            <Check size={12} />
          )}
          Mark all read
        </button>
      )}
    </div>
    {alerts.length === 0 ? (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        {emptyText}
      </div>
    ) : (
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {alerts.map((alert) => (
          <ReminderCard
            key={getAlertKey(alert)}
            alert={alert}
            fallbackTitle={fallbackTitle}
            onMarkSingle={onMarkSingle}
            isMarking={isMarking}
          />
        ))}
      </ul>
    )}
  </div>
);

const ServiceRemindersPanel = ({
  alerts = [],
  unreadCount = 0,
  isLoading = false,
  isMarking = false,
  onMarkAllStarting,
  onMarkAllEnding,
  onMarkSingle,
}) => {
  const startingServiceAlerts = alerts.filter(
    (alert) => getReminderType(alert) === "starting",
  );
  const endingServiceAlerts = alerts.filter(
    (alert) => getReminderType(alert) === "ending",
  );

  return (
    <section
      className="rounded-2xl border border-blue-200/60 shadow-sm overflow-hidden bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/30"
      aria-labelledby="service-reminders-heading"
    >
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-primary to-blue-500 text-white">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white shadow-inner">
              <Bell size={22} aria-hidden />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white shadow-md animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2
              id="service-reminders-heading"
              className="text-base font-bold tracking-tight"
            >
              Service Reminders
            </h2>
            <p className="text-xs text-white/85 mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} reminder${unreadCount > 1 ? "s" : ""} need your attention`
                : "All caught up — no new reminders"}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading alerts…</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-300">
              <Bell size={26} />
            </div>
            <p className="text-sm font-medium text-gray-700">
              No service reminders
            </p>
            <p className="text-xs text-gray-400">
              You'll see service start and end reminders here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <RemindersGroup
              heading="Starting Soon"
              emptyText="No service start reminders."
              fallbackTitle="Service starting soon"
              alerts={startingServiceAlerts}
              onMarkSingle={onMarkSingle}
              onMarkAll={onMarkAllStarting}
              isMarking={isMarking}
            />
            <RemindersGroup
              heading="Ending Soon"
              emptyText="No service end reminders."
              fallbackTitle="Service ending soon"
              alerts={endingServiceAlerts}
              onMarkSingle={onMarkSingle}
              onMarkAll={onMarkAllEnding}
              isMarking={isMarking}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceRemindersPanel;
