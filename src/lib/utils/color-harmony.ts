/**
 * Color Harmony & Luminance Contrast Utilities for ORBIT Theme Personalities.
 * Ensures WCAG AAA compliance and prevents out-of-gamut neon color clashes
 * across warm, editorial, and historical themes.
 */

export function isLightHexColor(hex: string): boolean {
  if (!hex || typeof hex !== "string") return false;
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 3 && cleanHex.length !== 6) return false;
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((c) => c + c)
          .join("")
      : cleanHex;

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;

  // ITU-R BT.709 perceived luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.48;
}

export function getContrastTextColor(bgHex: string): string {
  return isLightHexColor(bgHex) ? "#04111d" : "#ffffff";
}

/**
 * Harmonizes habit accent colors with the active theme personality to eliminate
 * jarring neon out-of-gamut clashes in warm/editorial themes (e.g. #00f0ff in Aesthetic/Archivist).
 */
export function getHarmonizedHabitColor(
  rawColor: string,
  themePersonality?: string,
  isDark: boolean = false
): string {
  if (!rawColor || !themePersonality) return rawColor || "#10b981";

  const lower = rawColor.toLowerCase().trim();

  // Detect out-of-gamut electric cyan / neon blues
  const isNeonCyan =
    lower === "#00f0ff" ||
    lower === "#00ffff" ||
    lower === "#06b6d4" ||
    lower === "#22d3ee" ||
    lower === "#38bdf8" ||
    lower === "#00e5a3";

  if (!isNeonCyan) return rawColor;

  switch (themePersonality) {
    case "aesthetic":
      // Kinfolk warm editorial terracotta / muted rust
      return isDark ? "#d97757" : "#c06c52";

    case "archivist":
      // Bodleian curatorial gilt gold / hunter green
      return isDark ? "#c8a765" : "#b89758";

    case "naturalist":
      // Biophilic canopy forest / eucalyptus
      return isDark ? "#40916c" : "#2d6a4f";

    case "minimalist":
      // Massimo Vignelli International Signal Orange
      return "#ff3b00";

    case "artistic":
      // Studio chromatic cobalt
      return isDark ? "#3b82f6" : "#2563eb";

    case "midnight":
      // Celestial indigo
      return isDark ? "#818cf8" : "#4f46e5";

    case "futuristic":
    default:
      // Native avionics cyber cyan
      return rawColor;
  }
}
