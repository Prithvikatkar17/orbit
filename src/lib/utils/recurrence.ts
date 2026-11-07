import type { Event } from "../schemas/event";

export interface EventOccurrence {
  event: Event;
  occurrenceDate: string; // "YYYY-MM-DD"
  isOccurrence: boolean;  // true if occurrenceDate !== event.date
}

/**
 * Parses "YYYY-MM-DD" into a local Date object.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns a "YYYY-MM-DD" string for the given Date object.
 */
export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns number of days in a given month (month is 1-12).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Generates all occurrences of an event that fall within the [startDateStr, endDateStr] range (inclusive).
 */
export function getOccurrencesForEvent(
  event: Event,
  startDateStr: string,
  endDateStr: string
): EventOccurrence[] {
  const occurrences: EventOccurrence[] = [];
  const rule = event.recurrence?.rule || "none";
  const recurrenceEnd = event.recurrence?.endDate;

  // Cannot occur before its creation date
  if (endDateStr < event.date) {
    return occurrences;
  }

  // Non-recurring
  if (rule === "none") {
    if (event.date >= startDateStr && event.date <= endDateStr) {
      occurrences.push({
        event,
        occurrenceDate: event.date,
        isOccurrence: false,
      });
    }
    return occurrences;
  }

  const [, origMonth, origDay] = event.date.split("-").map(Number);
  const startBound = startDateStr > event.date ? startDateStr : event.date;
  const endBound = recurrenceEnd && recurrenceEnd < endDateStr ? recurrenceEnd : endDateStr;

  if (startBound > endBound) {
    return occurrences;
  }

  const [startYear, startMonth] = startBound.split("-").map(Number);
  const [endYear, endMonth] = endBound.split("-").map(Number);

  if (rule === "daily") {
    let cur = parseLocalDate(startBound);
    const end = parseLocalDate(endBound);

    while (cur <= end) {
      const curStr = getLocalDateString(cur);
      occurrences.push({
        event,
        occurrenceDate: curStr,
        isOccurrence: curStr !== event.date,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
  } else if (rule === "weekly") {
    const origDateObj = parseLocalDate(event.date);
    const targetDayOfWeek = origDateObj.getDay();

    let cur = parseLocalDate(startBound);
    const end = parseLocalDate(endBound);

    while (cur <= end) {
      if (cur.getDay() === targetDayOfWeek) {
        const curStr = getLocalDateString(cur);
        occurrences.push({
          event,
          occurrenceDate: curStr,
          isOccurrence: curStr !== event.date,
        });
      }
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
  } else if (rule === "monthly") {
    // Iterate month by month
    let y = startYear;
    let m = startMonth;

    while (y < endYear || (y === endYear && m <= endMonth)) {
      const maxDaysInM = getDaysInMonth(y, m);
      // Clamp to month end if original day exceeds month days (e.g. 31st in a 30-day month)
      const clampedDay = Math.min(origDay, maxDaysInM);
      const mStr = String(m).padStart(2, "0");
      const dStr = String(clampedDay).padStart(2, "0");
      const candStr = `${y}-${mStr}-${dStr}`;

      if (candStr >= startBound && candStr <= endBound) {
        occurrences.push({
          event,
          occurrenceDate: candStr,
          isOccurrence: candStr !== event.date,
        });
      }

      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  } else if (rule === "yearly") {
    // Iterate year by year
    for (let y = startYear; y <= endYear; y++) {
      let candDay = origDay;
      // Handle Feb 29 on non-leap years
      if (origMonth === 2 && origDay === 29 && !isLeapYear(y)) {
        candDay = 28;
      }
      const mStr = String(origMonth).padStart(2, "0");
      const dStr = String(candDay).padStart(2, "0");
      const candStr = `${y}-${mStr}-${dStr}`;

      if (candStr >= startBound && candStr <= endBound) {
        occurrences.push({
          event,
          occurrenceDate: candStr,
          isOccurrence: candStr !== event.date,
        });
      }
    }
  }

  return occurrences;
}

/**
 * Collects and sorts all occurrences for a list of events in a date window.
 */
export function getAllOccurrencesForRange(
  events: Event[],
  startDateStr: string,
  endDateStr: string
): EventOccurrence[] {
  const result: EventOccurrence[] = [];

  for (const event of events) {
    const occs = getOccurrencesForEvent(event, startDateStr, endDateStr);
    result.push(...occs);
  }

  return result.sort((a, b) => {
    // Sort by date first
    if (a.occurrenceDate !== b.occurrenceDate) {
      return a.occurrenceDate.localeCompare(b.occurrenceDate);
    }
    // All day events first
    if (a.event.isAllDay && !b.event.isAllDay) return -1;
    if (!a.event.isAllDay && b.event.isAllDay) return 1;
    // Sort by start time
    const timeA = a.event.startTime || "00:00";
    const timeB = b.event.startTime || "00:00";
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    return a.event.title.localeCompare(b.event.title);
  });
}

/**
 * Finds the earliest occurrence on or after fromDateStr.
 */
export function getNextOccurrence(event: Event, fromDateStr: string): string | null {
  // Check next 2 years
  const [fYear] = fromDateStr.split("-").map(Number);
  const endWindow = `${fYear + 2}-12-31`;
  const occs = getOccurrencesForEvent(event, fromDateStr, endWindow);
  if (occs.length > 0) {
    return occs[0].occurrenceDate;
  }
  return null;
}

export interface CalendarCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

/**
 * Returns a 35 or 42 cell calendar grid for a given year and month (1-12).
 */
export function getMonthCalendarGrid(
  year: number,
  month: number, // 1-12
  todayStr: string,
  weekStartsOn: "monday" | "sunday" = "monday"
): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInCurrentMonth = getDaysInMonth(year, month);

  // Day of week of the 1st (0 = Sun, 1 = Mon, ..., 6 = Sat)
  let firstDayIndex = firstDayOfMonth.getDay();
  if (weekStartsOn === "monday") {
    // Shift so Mon = 0, Sun = 6
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  }

  // Previous month filler days
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const mStr = String(prevMonth).padStart(2, "0");
    const dStr = String(dayNum).padStart(2, "0");
    const dateStr = `${prevYear}-${mStr}-${dStr}`;
    const dateObj = new Date(prevYear, prevMonth - 1, dayNum);
    const dayOfWeek = dateObj.getDay();

    cells.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const mStr = String(month).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    const dateStr = `${year}-${mStr}-${dStr}`;
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();

    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Next month filler days to complete grid (multiples of 7: 35 or 42)
  const totalSlots = cells.length > 35 ? 42 : 35;
  const remainingSlots = totalSlots - cells.length;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  for (let d = 1; d <= remainingSlots; d++) {
    const mStr = String(nextMonth).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    const dateStr = `${nextYear}-${mStr}-${dStr}`;
    const dateObj = new Date(nextYear, nextMonth - 1, d);
    const dayOfWeek = dateObj.getDay();

    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return cells;
}

/**
 * Returns 7 days for the week containing dateStr.
 */
export function getWeekDays(
  dateStr: string,
  todayStr: string,
  weekStartsOn: "monday" | "sunday" = "monday"
): CalendarCell[] {
  const d = parseLocalDate(dateStr);
  const dayOfWeek = d.getDay(); // 0 = Sun
  let offsetToStart = 0;

  if (weekStartsOn === "monday") {
    offsetToStart = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  } else {
    offsetToStart = -dayOfWeek;
  }

  const startOfWeek = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetToStart);
  const days: CalendarCell[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
    const curStr = getLocalDateString(cur);
    const dow = cur.getDay();

    days.push({
      dateStr: curStr,
      dayNumber: cur.getDate(),
      isCurrentMonth: true,
      isToday: curStr === todayStr,
      isWeekend: dow === 0 || dow === 6,
    });
  }

  return days;
}

/**
 * Calculates the exact trigger timestamp in milliseconds for a given reminder and occurrence.
 */
export function calculateReminderTriggerTime(
  event: Event,
  occurrenceDate: string,
  reminder: { timing: { offsetMinutes?: number } },
  defaultAllDayTime = "09:00"
): number {
  const [year, month, day] = occurrenceDate.split("-").map(Number);
  let hours = 9;
  let minutes = 0;

  if (event.isAllDay) {
    const [defH, defM] = defaultAllDayTime.split(":").map(Number);
    hours = isNaN(defH) ? 9 : defH;
    minutes = isNaN(defM) ? 0 : defM;
  } else if (event.startTime) {
    const [stH, stM] = event.startTime.split(":").map(Number);
    hours = isNaN(stH) ? 0 : stH;
    minutes = isNaN(stM) ? 0 : stM;
  }

  const eventTime = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
  const offsetMinutes = reminder.timing.offsetMinutes || 0;
  return eventTime - offsetMinutes * 60 * 1000;
}

