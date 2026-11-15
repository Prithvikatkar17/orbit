/**
 * Deterministic archival and bookbinding mathematics and nomenclature helpers
 * for the Archivist personality ("The Bodleian Rare Book Folio & Curatorial Card Catalog").
 * Complies strictly with Data Honesty policies: real mathematical models calculated from real timestamps & records.
 */

export function getDayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function toRomanNumeral(num: number): string {
  if (num <= 0) return "O";
  const romanMap: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let result = "";
  let remaining = num;
  for (const [val, roman] of romanMap) {
    while (remaining >= val) {
      result += roman;
      remaining -= val;
    }
  }
  return result;
}

export function getCanonicalHour(timeStr?: string, date: Date = new Date()): { liturgical: string; secular: string } {
  let hour = date.getHours();
  if (timeStr && timeStr.includes(":")) {
    const parsed = parseInt(timeStr.split(":")[0], 10);
    if (!isNaN(parsed)) {
      hour = parsed;
    }
  }

  if (hour >= 5 && hour < 9) {
    return { liturgical: "Matins & Prime", secular: "Early Reading" };
  } else if (hour >= 9 && hour < 12) {
    return { liturgical: "Terce Hours", secular: "Morning Reading" };
  } else if (hour >= 12 && hour < 15) {
    return { liturgical: "Sext Folio", secular: "Afternoon Scriptorium" };
  } else if (hour >= 15 && hour < 18) {
    return { liturgical: "None Assembly", secular: "Afternoon Scriptorium" };
  } else if (hour >= 18 && hour < 21) {
    return { liturgical: "Vespers Colophon", secular: "Evening Illumination" };
  } else {
    return { liturgical: "Compline Archive", secular: "Night Silence" };
  }
}

export function numberToWord(n: number): string {
  const words = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen", "Twenty",
  ];
  if (n >= 0 && n < words.length) return words[n];
  return n.toString();
}

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
