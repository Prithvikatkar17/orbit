import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  quickCaptureOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openQuickCapture: () => void;
  closeQuickCapture: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  quickCaptureOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openQuickCapture: () => set({ quickCaptureOpen: true }),
  closeQuickCapture: () => set({ quickCaptureOpen: false }),
}));

