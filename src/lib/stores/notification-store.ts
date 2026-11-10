import { create } from "zustand";
import { db as defaultDb, type OrbitDatabase } from "../db/client.ts";
import {
  NotificationSchema,
  type NotificationItem,
} from "../schemas/notification.ts";

export type { NotificationItem };

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isHydrated: boolean;
  hydrateNotifications: (database?: OrbitDatabase) => Promise<void>;
  receivePersistedNotifications: (items: NotificationItem[]) => void;
  addNotification: (item: NotificationItem, database?: OrbitDatabase) => Promise<void>;
  markAsRead: (id: string, database?: OrbitDatabase) => Promise<void>;
  markAllAsRead: (database?: OrbitDatabase) => Promise<void>;
  dismissNotification: (id: string, database?: OrbitDatabase) => Promise<void>;
  clearAll: (database?: OrbitDatabase) => Promise<void>;
}

function sortNotificationsNewestFirst(list: NotificationItem[]): NotificationItem[] {
  return [...list].sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isHydrated: false,

  hydrateNotifications: async (database: OrbitDatabase = defaultDb) => {
    try {
      const persisted = await database.notifications.toArray();
      const sorted = sortNotificationsNewestFirst(persisted);
      set({
        notifications: sorted,
        unreadCount: sorted.filter((n) => !n.read).length,
        isHydrated: true,
      });
    } catch (err) {
      console.error("Failed to hydrate notifications from IndexedDB:", err);
      set({ isHydrated: true });
    }
  },

  receivePersistedNotifications: (items: NotificationItem[]) =>
    set((state) => {
      if (items.length === 0) return state;

      const existingIds = new Set(state.notifications.map((n) => n.id));
      const newOnes = items.filter((item) => !existingIds.has(item.id));
      if (newOnes.length === 0) return state;

      const updated = sortNotificationsNewestFirst([...newOnes, ...state.notifications]);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  addNotification: async (item: NotificationItem, database: OrbitDatabase = defaultDb) => {
    const validated = NotificationSchema.parse(item);

    // Check existing persisted record first to prevent duplicates
    const existing = await database.notifications.get(validated.id);
    if (existing) {
      return;
    }

    // Persist to IndexedDB BEFORE updating in-memory state
    await database.notifications.put(validated);

    set((state) => {
      if (state.notifications.some((n) => n.id === validated.id)) {
        return state;
      }
      const updated = sortNotificationsNewestFirst([validated, ...state.notifications]);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAsRead: async (id: string, database: OrbitDatabase = defaultDb) => {
    await database.notifications.update(id, { read: true });

    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: async (database: OrbitDatabase = defaultDb) => {
    const all = await database.notifications.toArray();
    const unread = all.filter((n) => !n.read);
    if (unread.length > 0) {
      await database.notifications.bulkPut(
        unread.map((n) => ({ ...n, read: true }))
      );
    }

    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  dismissNotification: async (id: string, database: OrbitDatabase = defaultDb) => {
    await database.notifications.delete(id);

    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  clearAll: async (database: OrbitDatabase = defaultDb) => {
    await database.notifications.clear();

    set({
      notifications: [],
      unreadCount: 0,
    });
  },
}));
