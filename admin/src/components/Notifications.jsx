import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, Clock } from "lucide-react";
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from "../api/apiSlice";
import toast from "react-hot-toast";

const Notifications = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [flashNotification, setFlashNotification] = useState(null);
  const prevNotificationIdsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const [markAsRead] = useMarkNotificationAsReadMutation();

  // Robust audio unlock mechanism
  useEffect(() => {
    const handleUserInteraction = () => {
      const audio = audioRef.current;
      if (!audio) return;

      // Only attempt to unlock if not already unlocked
      if (audioUnlockedRef.current) return;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audioUnlockedRef.current = true;
            // Remove listeners once unlocked
            document.removeEventListener("click", handleUserInteraction);
            document.removeEventListener("keydown", handleUserInteraction);
            console.log("Audio playback unlocked by user interaction");
          })
          .catch((error) => {
            console.log("Audio unlock attempt failed:", error);
          });
      }
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  // Fetch notifications
  const { data: notificationResponse } = useGetNotificationsQuery(undefined, {
    pollingInterval: 10000,
  });

  const notifications = notificationResponse?.data || [];

  // Filter out read notifications based on server status
  const visibleNotifications = notifications.filter((n) => !n.is_read);

  const notificationCount =
    notificationResponse?.total_count || visibleNotifications.length;

  const playNotifySound = () => {
    if (!audioRef.current) return;

    const audioObj = audioRef.current;
    audioObj.currentTime = 0;
    audioObj.volume = 1.0;

    const playPromise = audioObj.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        if (error.name === "NotAllowedError") {
          console.warn(
            "Audio playback blocked: User has not interacted with the document yet.",
          );
          // Do not retry - it will just fail again
        } else {
          console.error("Audio playback failed:", error);
          // Only fallback for non-permission errors
          try {
            new Audio("/notification.wav")
              .play()
              .catch((e) => console.error("Fallback failed:", e));
          } catch (e) {
            console.error("Fallback creation failed:", e);
          }
        }
      });
    }
  };

  const handleNotificationClick = async (id) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
    navigate("/orders-booking");
    setShowNotifications(false);
  };

  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n.id));
    if (!initializedRef.current) {
      prevNotificationIdsRef.current = currentIds;
      initializedRef.current = true;
      return;
    }

    const newIds = [];
    for (const id of currentIds) {
      if (!prevNotificationIdsRef.current.has(id)) {
        newIds.push(id);
      }
    }

    if (newIds.length > 0) {
      playNotifySound();

      // Show flash notification for the latest new notification (first in the list)
      const latestId = newIds[0];
      const notification = notifications.find((n) => n.id === latestId);

      if (notification) {
        setFlashNotification(notification);
      }
    }
    prevNotificationIdsRef.current = currentIds;
  }, [notifications]);

  const handleViewAll = () => {
    // Mark all visible notifications as read
    visibleNotifications.forEach((n) => {
      markAsRead(n.id).catch((err) =>
        console.error(`Failed to mark notification ${n.id} as read`, err),
      );
    });

    navigate("/orders-booking");
    setShowNotifications(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotifications &&
        !event.target.closest(".notification-container")
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <>
      {flashNotification &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-enter">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100 opacity-100 border-t-8 border-primary relative">
              {/* Close Button */}
              <button
                onClick={() => setFlashNotification(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className="p-8 text-center">
                {/* Animated Bell Icon */}
                <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Bell size={48} className="text-primary animate-bell" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {flashNotification.title}
                </h3>

                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {flashNotification.message}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      handleNotificationClick(flashNotification.id);
                      setFlashNotification(null);
                    }}
                    className="w-full sm:w-auto px-8 py-3 bg-primary text-white text-lg font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                  >
                    View Order
                  </button>
                  <button
                    onClick={() => setFlashNotification(null)}
                    className="w-full sm:w-auto px-8 py-3 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <div className="relative notification-container">
        <audio ref={audioRef} src="/notification.wav" preload="auto" />
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-all duration-200 hover:text-primary active:scale-95 outline-none"
        >
          <span className="sr-only">Notifications</span>
          <Bell
            size={20}
            className={notificationCount > 0 ? "animate-bell" : ""}
          />
          {notificationCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              <span className="absolute top-1.5 right-1.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white px-1 z-10">
                {notificationCount}
              </span>
            </>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl py-2 border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none transform opacity-100 scale-100 transition-all duration-200 origin-top-right z-50">
            <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                {notificationCount} New
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {visibleNotifications.length > 0 ? (
                visibleNotifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </span>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                        {notification.date_label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500">
                      <Clock size={10} />
                      <span>{notification.time_slot}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No new notifications</p>
                </div>
              )}
            </div>
            {visibleNotifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/50">
                <button
                  onClick={handleViewAll}
                  className="text-xs font-medium text-primary hover:text-blue-700 w-full text-center transition-colors"
                >
                  View all bookings
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Notifications;
