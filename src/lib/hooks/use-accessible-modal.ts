"use client";

import { useEffect, useRef } from "react";
import { computeNextFocusIndex, getFocusableElements } from "../utils/focus-trap";

interface UseAccessibleModalOptions {
  isOpen?: boolean;
  /** Temporarily pause keyboard handling (e.g. when a nested alertdialog is open) without losing focus history */
  paused?: boolean;
  onClose: () => void;
}

/**
 * Provides standardized modal keyboard accessibility:
 * - Captures previously focused trigger element and restores focus on close/unmount
 * - Traps Tab / Shift+Tab navigation within the dialog container
 * - Closes dialog safely on Escape key press
 */
export function useAccessibleModal({
  isOpen = true,
  paused = false,
  onClose,
}: UseAccessibleModalOptions) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const pausedRef = useRef(paused);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus the modal's autofocus element or first interactive element if focus isn't already inside
    const frameId = requestAnimationFrame(() => {
      const container = modalRef.current;
      if (!container) return;
      if (container.contains(document.activeElement)) return;

      const focusables = getFocusableElements(container);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        container.focus();
      }
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (pausedRef.current) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab") {
        const container = modalRef.current;
        if (!container) return;

        const focusables = getFocusableElements(container);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const currentActive =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const currentIndex = currentActive ? focusables.indexOf(currentActive) : -1;
        const nextIndex = computeNextFocusIndex(focusables.length, currentIndex, e.shiftKey);

        if (nextIndex >= 0 && nextIndex < focusables.length) {
          e.preventDefault();
          focusables[nextIndex].focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeyDown);

      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen]);

  return modalRef;
}

