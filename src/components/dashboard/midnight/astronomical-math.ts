/**
 * Deterministic astronomical and horological math utilities for the Midnight Observatory theme.
 * Complies strictly with Data Honesty policies: real mathematical models calculated from real timestamps.
 */

// Known astronomical epoch for a New Moon: January 11, 2024 at 11:57:00 UTC
const KNOWN_NEW_MOON_EPOCH = Date.UTC(2024, 0, 11, 11, 57, 0);
// Exact synodic month duration in milliseconds (29.53058867 days)
const SYNODIC_MONTH_MS = 29.53058867 * 86400 * 1000;
const SYNODIC_MONTH_DAYS = 29.53058867;

export interface LunarPhaseResult {
  phaseName: string;
  cycleDay: number;
  illuminationPct: number;
  isWaxing: boolean;
  phaseCode: string;
}

/**
 * Calculates the exact lunar phase and synodic cycle day from any given Date.
 */
export function calculateLunarPhase(date: Date = new Date()): LunarPhaseResult {
  const diffMs = date.getTime() - KNOWN_NEW_MOON_EPOCH;
  const cycleDayDecimal = (((diffMs % SYNODIC_MONTH_MS) + SYNODIC_MONTH_MS) % SYNODIC_MONTH_MS) / (86400 * 1000);
  const cycleDay = Math.floor(cycleDayDecimal) + 1;

  // Illumination calculation based on phase angle
  const phaseAngle = (2 * Math.PI * cycleDayDecimal) / SYNODIC_MONTH_DAYS;
  const illuminationPct = Math.round(((1 - Math.cos(phaseAngle)) / 2) * 100);
  const isWaxing = cycleDayDecimal < (SYNODIC_MONTH_DAYS / 2);

  let phaseName = "New Moon";
  let phaseCode = "NM";

  if (cycleDayDecimal < 1.845) {
    phaseName = "New Moon";
    phaseCode = "NM";
  } else if (cycleDayDecimal < 5.536) {
    phaseName = "Waxing Crescent";
    phaseCode = "XC";
  } else if (cycleDayDecimal < 9.228) {
    phaseName = "First Quarter";
    phaseCode = "FQ";
  } else if (cycleDayDecimal < 12.92) {
    phaseName = "Waxing Gibbous";
    phaseCode = "XG";
  } else if (cycleDayDecimal < 16.611) {
    phaseName = "Full Moon";
    phaseCode = "FM";
  } else if (cycleDayDecimal < 20.303) {
    phaseName = "Waning Gibbous";
    phaseCode = "NG";
  } else if (cycleDayDecimal < 23.994) {
    phaseName = "Last Quarter";
    phaseCode = "LQ";
  } else if (cycleDayDecimal < 27.686) {
    phaseName = "Waning Crescent";
    phaseCode = "NC";
  } else {
    phaseName = "New Moon";
    phaseCode = "NM";
  }

  return {
    phaseName,
    cycleDay,
    illuminationPct,
    isWaxing,
    phaseCode,
  };
}

/**
 * Derives the sidereal/solar meridian phase from the local clock hour.
 */
export function getSiderealMeridianPhase(hour: number = new Date().getHours()): string {
  if (hour >= 5 && hour < 9) return "ASCENDING AURORAL MERIDIAN";
  if (hour >= 9 && hour < 14) return "ZENITH SOLAR CULMINATION";
  if (hour >= 14 && hour < 18) return "DESCENDING STELLAR HORIZON";
  if (hour >= 18 && hour < 22) return "TWILIGHT SIDEREAL TRANSIT";
  return "NADIR OBSIDIAN COSMOS";
}

/**
 * Returns astronomical transit phases for event chronologies.
 */
export function getEventTransitPhase(timeStr?: string): string {
  if (!timeStr) return "Zenith Transit";
  const [hStr] = timeStr.split(":");
  const hour = parseInt(hStr, 10);
  if (isNaN(hour)) return "Zenith Transit";

  if (hour < 11) return "Zenith Rise";
  if (hour < 15) return "Upper Meridian";
  if (hour < 18) return "Twilight Horizon";
  return "Stellar Transit";
}

const CONSTELLATIONS = [
  "Lyra",
  "Orion",
  "Cassiopeia",
  "Cygnus",
  "Pegasus",
  "Andromeda",
  "Aquila",
  "Phoenix",
];

export function getConstellationForHabit(index: number): string {
  return CONSTELLATIONS[index % CONSTELLATIONS.length];
}

export function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function numberToWord(n: number): string {
  const words = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
  ];
  return words[n] || String(n);
}
