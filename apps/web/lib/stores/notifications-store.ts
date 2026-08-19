import { create } from "zustand";
import type { NotificationDto } from "@anora/shared-types";

interface NotificationsState {
  items: NotificationDto[];
  unreadCount: number;
  setAll: (items: NotificationDto[]) => void;
  add: (item: NotificationDto) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unreadCount: 0,
  setAll: (items) => set({ items, unreadCount: items.filter((i) => !i.isRead).length }),
  add: (item) =>
    set((state) => ({
      items: [item, ...state.items].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    })),
  markRead: (id) =>
    set((state) => {
      const items = state.items.map((i) => (i.id === id ? { ...i, isRead: true } : i));
      return { items, unreadCount: items.filter((i) => !i.isRead).length };
    }),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((i) => ({ ...i, isRead: true })),
      unreadCount: 0,
    })),
}));
