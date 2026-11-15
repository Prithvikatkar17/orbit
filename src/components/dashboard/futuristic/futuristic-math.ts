/**
 * Clean deterministic formatting helpers for the Futuristic personality
 * ("Linear / Teenage Engineering Precision Workspace").
 * Strictly enforces Data Honesty: zero fake telemetry, zero fake flight-sim jargon.
 */

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
  if (n >= 0 && n < words.length) return words[n];
  return String(n);
}

export function formatRealStatusSentence(
  openCount: number,
  dueTodayCount: number,
  overdueCount: number
): string {
  const openWord = numberToWord(openCount);
  const taskNoun = openCount === 1 ? "task" : "tasks";

  if (openCount === 0) {
    return "All tasks cleared. Workspace is fully caught up.";
  }

  const parts = [`${openWord} open ${taskNoun} in queue`];

  if (dueTodayCount > 0) {
    const dueWord = dueTodayCount === openCount ? "all" : numberToWord(dueTodayCount).toLowerCase();
    parts.push(`with ${dueWord} due today`);
  }

  if (overdueCount > 0) {
    parts.push(`(${overdueCount} overdue)`);
  }

  return parts.join(", ") + ".";
}
