import { create } from "zustand";

export interface QuickCaptureInitialData {
  title?: string;
  notes?: string;
  link?: string;
  category?: string;
}

export function parseShareTargetDraft(raw: string): QuickCaptureInitialData {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  let link = "";
  let remainingText = trimmed;

  const urlMatch = remainingText.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    link = urlMatch[0];
    remainingText = remainingText.replace(link, "").trim();
    remainingText = remainingText.replace(/[:\-–—\s]+$/, "").trim();
  }

  let title = "";
  let notes = "";

  if (remainingText) {
    const lines = remainingText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      title = lines[0];
      notes = lines.slice(1).join("\n");
    }
  } else if (link) {
    try {
      const parsed = new URL(link);
      title = parsed.hostname.replace(/^www\./, "");
    } catch {
      title = "Shared Link";
    }
  }

  return { title, notes, link };
}

interface UIState {
  sidebarOpen: boolean;
  quickCaptureOpen: boolean;
  quickCaptureInitialData?: QuickCaptureInitialData;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openQuickCapture: (data?: QuickCaptureInitialData | string | unknown) => void;
  closeQuickCapture: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  quickCaptureOpen: false,
  quickCaptureInitialData: undefined,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openQuickCapture: (data) => {
    if (typeof data === "string") {
      const parsed = parseShareTargetDraft(data);
      set({
        quickCaptureOpen: true,
        quickCaptureInitialData: parsed,
      });
    } else if (
      data &&
      typeof data === "object" &&
      !("nativeEvent" in data) &&
      ("title" in data || "notes" in data || "link" in data || "category" in data)
    ) {
      set({
        quickCaptureOpen: true,
        quickCaptureInitialData: data as QuickCaptureInitialData,
      });
    } else {
      set({
        quickCaptureOpen: true,
        quickCaptureInitialData: undefined,
      });
    }
  },
  closeQuickCapture: () => set({ quickCaptureOpen: false, quickCaptureInitialData: undefined }),
}));


