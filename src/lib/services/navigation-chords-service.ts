import { useUIStore } from "../stores/ui-store.ts";
import { useSearchStore } from "../stores/search-store.ts";

export const CHORD_NAV_MAP: Record<string, string> = {
  i: "/inbox",
  t: "/tasks",
  h: "/habits",
  c: "/calendar",
  l: "/library",
  d: "/",
};

export function shouldIgnoreNavigationChord(target: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const elem = target as { tagName?: string; isContentEditable?: boolean };
  const tagName = elem.tagName?.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }
  if (elem.isContentEditable) {
    return true;
  }
  return false;
}

export function isAnyModalOpen(): boolean {
  if (typeof useUIStore?.getState === "function" && useUIStore.getState().quickCaptureOpen) {
    return true;
  }
  if (typeof useSearchStore?.getState === "function" && useSearchStore.getState().isSearchOpen) {
    return true;
  }
  if (typeof document !== "undefined") {
    if (document.querySelector(".orbit-modal-backdrop")) {
      return true;
    }
  }
  return false;
}
