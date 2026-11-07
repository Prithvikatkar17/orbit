"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Check,
  X,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  useNotificationStore,
  type NotificationItem,
} from "@/lib/stores/notification-store";
import {
  acknowledgeReminder,
  requestNotificationPermission,
} from "@/lib/services/reminder-service";
import { EVENT_TYPE_MAP } from "@/lib/constants";
import { useMounted } from "@/lib/utils/dates";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  } = useNotificationStore();

  // Viewport-aware positioning: ensures the panel remains 100% inside the visible screen
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const margin = 16;
    const maxPanelWidth = 384; // Matches Tailwind max-w-sm / w-96
    const panelWidth = Math.min(maxPanelWidth, vw - margin * 2);

    let left: number;
    if (rect.left < vw / 2) {
      // Button on left half (e.g. desktop sidebar): align with button, expanding rightwards
      left = rect.left;
      if (left + panelWidth > vw - margin) {
        left = vw - margin - panelWidth;
      }
    } else {
      // Button on right half (e.g. mobile header): align right edge with button's right edge
      left = rect.right - panelWidth;
    }

    // Clamp horizontally to guarantee viewport bounds
    left = Math.max(margin, Math.min(left, vw - margin - panelWidth));

    // Vertical positioning: placed 8px below button, clamped to viewport bottom
    const top = rect.bottom + 8;
    const maxPanelHeight = Math.max(200, Math.min(480, vh - top - margin));

    setPanelStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${panelWidth}px`,
      maxHeight: `${maxPanelHeight}px`,
      zIndex: 50,
    });
  }, []);

  // Recalculate position on window resize or scroll when open
  useEffect(() => {
    if (!isOpen) return;

    function handleWindowChange() {
      updatePosition();
    }

    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen, updatePosition]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      if (panelRef.current && panelRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleRequestPermission() {
    const res = await requestNotificationPermission();
    setPermission(res);
  }

  async function handleAcknowledge(item: NotificationItem) {
    await acknowledgeReminder(item.reminderId);
    markAsRead(item.id);
  }

  return (
    <>
      {/* Bell Icon Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          if (!isOpen) {
            if (typeof window !== "undefined" && "Notification" in window) {
              setPermission(Notification.permission);
            }
            updatePosition();
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {mounted && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Flyout Portal: Rendered to document.body with viewport clamping */}
      {isOpen && mounted && typeof document !== "undefined" && panelStyle && createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between border-b border-slate-100 p-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {notifications.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                  >
                    Mark all read
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Browser Permission Banner (if not granted) */}
          {permission === "default" && (
            <div className="shrink-0 flex items-center justify-between bg-amber-50 px-3.5 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-b border-amber-100 dark:border-amber-900/50">
              <span className="text-[11px] font-medium">Enable desktop alerts</span>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-amber-500"
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List (Scrollable Area) */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-2">
                  <Check className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No pending reminders or alerts right now.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const typeCfg =
                  EVENT_TYPE_MAP[item.eventType] || EVENT_TYPE_MAP.general;

                return (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between p-3.5 text-xs transition-colors ${
                      item.read
                        ? "bg-white opacity-70 dark:bg-slate-900"
                        : "bg-indigo-50/20 dark:bg-indigo-950/20 font-medium"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 pr-2">
                      <span className="text-sm mt-0.5">{typeCfg.icon}</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.eventTitle}
                          </span>
                          {item.isMissed && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Missed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.scheduledTime}
                          </span>
                          <span>•</span>
                          <span>{item.occurrenceDate}</span>
                        </div>

                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(item)}
                            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Acknowledge</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => dismissNotification(item.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
