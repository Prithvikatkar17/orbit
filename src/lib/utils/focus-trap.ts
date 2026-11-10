/**
 * Selector matching standard keyboard-focusable interactive elements inside modals.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Computes the next focusable element index within a bounded focus trap,
 * wrapping cleanly between first and last interactive elements on Tab / Shift+Tab.
 */
export function computeNextFocusIndex(
  totalCount: number,
  currentIndex: number,
  isShiftTab: boolean
): number {
  if (totalCount <= 0) return -1;

  if (isShiftTab) {
    if (currentIndex <= 0 || currentIndex >= totalCount) {
      return totalCount - 1;
    }
    return currentIndex - 1;
  }

  if (currentIndex < 0 || currentIndex >= totalCount - 1) {
    return 0;
  }
  return currentIndex + 1;
}

/**
 * Queries visible, enabled focusable HTMLElements within a container element.
 */
export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  return candidates.filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return true;
  });
}

