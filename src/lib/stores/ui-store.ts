import { create } from "zustand";

export interface QuickCaptureInitialData {
  title?: string;
  notes?: string;
  link?: string;
  category?: string;
}

export function parseShareTargetDraft(
  input: string | { title?: string | null; text?: string | null; url?: string | null }
): QuickCaptureInitialData {
  let rawTitle = "";
  let rawText = "";
  let rawUrl = "";

  if (typeof input === "string") {
    rawText = input.trim();
  } else if (input && typeof input === "object") {
    rawTitle = (input.title ?? "").trim();
    rawText = (input.text ?? "").trim();
    rawUrl = (input.url ?? "").trim();
  }

  if (!rawTitle && !rawText && !rawUrl) {
    return {};
  }

  let link = rawUrl;
  let remainingText = rawText;

  const urlMatch = remainingText.match(/https?:\/\/[^\s]+/i);
  if (!link && urlMatch) {
    link = urlMatch[0];
    remainingText = remainingText.replace(link, "").trim();
    remainingText = remainingText.replace(/[:\-–—\s]+$/, "").trim();
  }

  let title = rawTitle;
  let notes = "";

  if (title) {
    notes = remainingText;
  } else if (remainingText) {
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

  const category = link ? "bookmark" : "inbox";

  return { title, notes, link, category };
}

export interface CaptureInboxPayload {
  id?: string;
  title: string;
  notes?: string;
  link?: string;
  category?: string;
  status?: string;
  priority?: string;
  createdAt?: number | string;
}

export async function captureInboxItem(payload: CaptureInboxPayload) {
  const response = await fetch("/api/inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to capture item: ${response.status}`);
  }
  return response.json();
}

interface UIState {
  sidebarOpen: boolean;
  quickCaptureOpen: boolean;
  quickCaptureInitialData?: QuickCaptureInitialData;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openQuickCapture: (data?: QuickCaptureInitialData | string | unknown) => void;
  closeQuickCapture: () => void;
  captureToInbox: (payload: CaptureInboxPayload) => Promise<{ success: boolean; item?: unknown }>;
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
  captureToInbox: async (payload) => {
    return captureInboxItem(payload);
  },
}));


