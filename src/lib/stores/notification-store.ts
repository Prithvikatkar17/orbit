import { create } from "zustand";

export interface NotificationItem {
  id: string;            // unique notification delivery ID
  reminderId: string;
  eventId: string;
  eventTitle: string;
  eventType: string;
  occurrenceDate: string; // "YYYY-MM-DD"
  scheduledTime: string;  // event time or formatted trigger
  isMissed: boolean;      // true if scheduled time passed while app was inactive
  deliveredAt: string;    // ISO timestamp
  read: boolean;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (item: NotificationItem) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (item) =>
    set((state) => {
      // Prevent exact duplicate notifications in the active list
      if (state.notifications.some((n) => n.id === item.id)) {
        return state;
      }
      const updated = [item, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  dismissNotification: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  clearAll: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));

