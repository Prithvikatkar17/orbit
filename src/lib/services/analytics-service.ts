/**
 * Pure Analytics Engine & Calculation Core for ORBIT.
 * Local-first, offline, timezone-safe, and independent of React/Dexie.
 */

import type { Task, Habit, HabitLog } from "../schemas/index.ts";
import {
  getLocalDateString,
  parseLocalDate,
  getOffsetDateString,
  isScheduledDay,
  getWeekMonday,
  calculateStreak,
} from "../utils/dates.ts";

export type DateRangeType = "7d" | "30d" | "90d" | "all";

export interface ResolvedDateRange {
  type: DateRangeType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  daysCount: number;
  previousStartDate: string | null; // "YYYY-MM-DD" or null for "all"
  previousEndDate: string | null; // "YYYY-MM-DD" or null for "all"
}

export interface DailyCount {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface TaskOverviewMetrics {
  totalTasks: number; // all non-archived tasks
  completedTasks: number; // status === "completed"
  pendingTasks: number; // status === "todo" || status === "in_progress"
  overdueTasks: number; // pending with dueDate < today
  dueTodayTasks: number; // pending with dueDate === today
  upcomingTasks: number; // pending with dueDate > today
  somedayTasks: number; // pending without dueDate
  completionRate: number; // 0 to 100 (percentage)
}

export interface HabitConsistencyMetrics {
  habitId: string;
  title: string;
  frequency: Habit["frequency"];
  isActive: boolean;
  scheduledCount: number;
  completedCount: number;
  consistencyRate: number; // 0 to 100 (percentage)
}

export interface OverallHabitConsistency {
  totalScheduled: number;
  totalCompleted: number;
  consistencyRate: number; // 0 to 100 (percentage)
  habits: HabitConsistencyMetrics[];
}

export interface HabitStreakMetrics {
  habitId: string;
  title: string;
  frequency: Habit["frequency"];
  isActive: boolean;
  currentStreak: number;
  bestStreak: number;
}

export interface GlobalStreakMetrics {
  longestCurrentStreak: number;
  longestCurrentHabit: HabitStreakMetrics | null;
  bestAllTimeStreak: number;
  bestAllTimeHabit: HabitStreakMetrics | null;
  habits: HabitStreakMetrics[];
}

export interface GoalItemProgress {
  id: string;
  title: string;
  status: Task["status"];
  priority: Task["priority"];
  dueDate?: string;
  completedAt?: string;
}

export interface GoalProgressMetrics {
  totalGoals: number;
  completedGoals: number;
  pendingGoals: number;
  progressPercentage: number; // 0 to 100
  goals: GoalItemProgress[];
}

export interface CategoryDistributionItem {
  category: string;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  percentageOfTotal: number; // 0 to 100
}

export interface PriorityDistributionItem {
  priority: "high" | "medium" | "low";
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  percentageOfTotal: number; // 0 to 100
}

export interface TaskDistributions {
  byCategory: CategoryDistributionItem[];
  byPriority: PriorityDistributionItem[];
  totalEligibleTasks: number;
}

export interface PeriodComparison {
  current: number;
  previous: number | null;
  absoluteChange: number | null;
  percentageChange: number | null; // e.g. 25 for +25%, -10 for -10%, null if previous is null
  trend: "up" | "down" | "neutral" | "none";
}

export interface AccomplishmentItem {
  id: string;
  type: "task" | "goal";
  title: string;
  completedAt: string;
  completedDate: string; // "YYYY-MM-DD"
  category: string;
  priority: "high" | "medium" | "low";
}

export interface AnalyticsSnapshot {
  range: ResolvedDateRange;
  taskOverview: TaskOverviewMetrics;
  tasksCompletedInRange: number;
  habitsCompletedInRange: number;
  taskPeriodComparison: PeriodComparison;
  habitPeriodComparison: PeriodComparison;
  dailyTaskCompletions: DailyCount[];
  dailyHabitCompletions: DailyCount[];
  habitConsistency: OverallHabitConsistency;
  habitStreaks: GlobalStreakMetrics;
  goalProgress: GoalProgressMetrics;
  distributions: TaskDistributions;
  recentAccomplishments: AccomplishmentItem[];
}

/**
 * Normalizes an ISO datetime or date string into a local "YYYY-MM-DD".
 * Guards against UTC midnight rollover issues for pure date strings.
 */
export function getEntityLocalDate(isoOrDate?: string): string {
  if (!isoOrDate) return getLocalDateString();
  const trimmed = isoOrDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return getLocalDateString();
    return getLocalDateString(d);
  } catch {
    return getLocalDateString();
  }
}

/**
 * Resolves calendar date bounds for standard range filters.
 * Returns both current window and comparison window.
 * For "all", comparison window is strictly null to avoid misleading comparisons.
 */
export function resolveDateRange(
  rangeType: DateRangeType,
  options?: { today?: string; earliestDate?: string }
): ResolvedDateRange {
  const today = options?.today || getLocalDateString();
  const refDate = parseLocalDate(today);

  if (rangeType === "7d") {
    const startDate = getOffsetDateString(-6, refDate);
    const prevEnd = getOffsetDateString(-7, refDate);
    const prevStart = getOffsetDateString(-13, refDate);
    return {
      type: "7d",
      startDate,
      endDate: today,
      daysCount: 7,
      previousStartDate: prevStart,
      previousEndDate: prevEnd,
    };
  }

  if (rangeType === "30d") {
    const startDate = getOffsetDateString(-29, refDate);
    const prevEnd = getOffsetDateString(-30, refDate);
    const prevStart = getOffsetDateString(-59, refDate);
    return {
      type: "30d",
      startDate,
      endDate: today,
      daysCount: 30,
      previousStartDate: prevStart,
      previousEndDate: prevEnd,
    };
  }

  if (rangeType === "90d") {
    const startDate = getOffsetDateString(-89, refDate);
    const prevEnd = getOffsetDateString(-90, refDate);
    const prevStart = getOffsetDateString(-179, refDate);
    return {
      type: "90d",
      startDate,
      endDate: today,
      daysCount: 90,
      previousStartDate: prevStart,
      previousEndDate: prevEnd,
    };
  }

  // All Time: start from earliestDate or today if none provided.
  let startDate = options?.earliestDate ? getEntityLocalDate(options.earliestDate) : today;
  if (startDate > today) {
    startDate = today;
  }

  const startD = parseLocalDate(startDate);
  const diffDays = Math.max(
    1,
    Math.round((refDate.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  return {
    type: "all",
    startDate,
    endDate: today,
    daysCount: diffDays,
    previousStartDate: null,
    previousEndDate: null,
  };
}

/**
 * Generates an array of all local "YYYY-MM-DD" dates between startDate and endDate inclusive.
 */
export function getDateList(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [startDate];
  const list: string[] = [];
  let cur = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  let safety = 0;
  while (cur <= end && safety < 10000) {
    list.push(getLocalDateString(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    safety++;
  }
  return list;
}

/**
 * Extracts local completion date for a task:
 * - Uses `completedAt` if available.
 * - Falls back to `updatedAt` ONLY when `completedAt` is missing.
 * - Returns null if the task is not completed or timestamps are invalid.
 */
export function getTaskCompletionDate(
  task: Pick<Task, "status" | "completedAt" | "updatedAt">
): string | null {
  if (task.status !== "completed") return null;
  const rawDate = task.completedAt || task.updatedAt;
  if (!rawDate) return null;
  return getEntityLocalDate(rawDate);
}

/**
 * Aggregates task completions per calendar day for a given date range.
 * Every day in the range is present with at least 0 completions.
 */
export function getDailyTaskCompletions(
  tasks: Task[],
  startDate: string,
  endDate: string
): DailyCount[] {
  const dates = getDateList(startDate, endDate);
  const countMap = new Map<string, number>();
  for (const d of dates) {
    countMap.set(d, 0);
  }

  for (const task of tasks) {
    if (task.status !== "completed") continue;
    const completionDate = getTaskCompletionDate(task);
    if (completionDate && countMap.has(completionDate)) {
      countMap.set(completionDate, (countMap.get(completionDate) || 0) + 1);
    }
  }

  return dates.map((d) => ({
    date: d,
    count: countMap.get(d) || 0,
  }));
}

/**
 * Counts total tasks completed strictly within a date range [startDate, endDate].
 */
export function getTasksCompletedInRange(
  tasks: Task[],
  startDate: string,
  endDate: string
): number {
  let count = 0;
  for (const task of tasks) {
    if (task.status !== "completed") continue;
    const date = getTaskCompletionDate(task);
    if (date && date >= startDate && date <= endDate) {
      count++;
    }
  }
  return count;
}

/**
 * Aggregates daily completed habit check-ins for a given date range.
 * Bounds habit logs by habit.createdAt if habits list is provided.
 * Counts unique habits completed on each date.
 */
export function getDailyHabitCompletions(
  habitLogs: HabitLog[],
  startDate: string,
  endDate: string,
  habits?: Habit[]
): DailyCount[] {
  const dates = getDateList(startDate, endDate);
  const habitsMap = habits ? new Map(habits.map((h) => [h.id, h])) : null;

  // Map each date to a Set of completed habit IDs
  const completedByDate = new Map<string, Set<string>>();
  for (const d of dates) {
    completedByDate.set(d, new Set<string>());
  }

  for (const log of habitLogs) {
    if (!log.completed) continue;
    const logDate = log.date;
    const set = completedByDate.get(logDate);
    if (!set) continue;

    if (habitsMap) {
      const habit = habitsMap.get(log.habitId);
      // Bound by habit.createdAt: log must not predate the habit's creation date
      if (habit) {
        const habitCreatedDate = getEntityLocalDate(habit.createdAt);
        if (logDate < habitCreatedDate) {
          continue;
        }
      }
    }

    set.add(log.habitId);
  }

  return dates.map((d) => ({
    date: d,
    count: completedByDate.get(d)?.size || 0,
  }));
}

/**
 * Counts total completed habit check-ins strictly within a date range [startDate, endDate].
 */
export function getHabitsCompletedInRange(
  habitLogs: HabitLog[],
  startDate: string,
  endDate: string,
  habits?: Habit[]
): number {
  const daily = getDailyHabitCompletions(habitLogs, startDate, endDate, habits);
  return daily.reduce((sum, item) => sum + item.count, 0);
}

/**
 * Calculates task overview metrics:
 * - Excludes archived tasks from completion-rate denominators.
 * - Identifies overdue tasks, due today, upcoming, and someday.
 * - Safely returns 0% when no eligible tasks exist.
 */
export function getTaskOverviewMetrics(
  tasks: Task[],
  todayStr = getLocalDateString()
): TaskOverviewMetrics {
  const activeTasks = tasks.filter((t) => t.status !== "archived");
  const totalTasks = activeTasks.length;

  let completedTasks = 0;
  let pendingTasks = 0;
  let overdueTasks = 0;
  let dueTodayTasks = 0;
  let upcomingTasks = 0;
  let somedayTasks = 0;

  for (const task of activeTasks) {
    if (task.status === "completed") {
      completedTasks++;
    } else {
      pendingTasks++;
      if (!task.dueDate) {
        somedayTasks++;
      } else if (task.dueDate < todayStr) {
        overdueTasks++;
      } else if (task.dueDate === todayStr) {
        dueTodayTasks++;
      } else {
        upcomingTasks++;
      }
    }
  }

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    dueTodayTasks,
    upcomingTasks,
    somedayTasks,
    completionRate,
  };
}

/**
 * Calculates habit consistency percentages across a date range:
 * - Bounds habit schedule calculation by `habit.createdAt`.
 * - Accounts for "daily", "weekdays", "weekly", and "custom" frequencies.
 * - Includes historically relevant inactive habits by default if created on or before endDate.
 * - Handles zero scheduled days without NaN or Infinity.
 */
export function calculateHabitConsistency(params: {
  habits: Habit[];
  habitLogs: HabitLog[];
  startDate: string;
  endDate: string;
  includeInactive?: boolean;
}): OverallHabitConsistency {
  const { habits, habitLogs, startDate, endDate, includeInactive = true } = params;

  // Filter habits: active or historically relevant (created on or before the end of the window)
  const eligibleHabits = habits.filter((h) => {
    if (!includeInactive && !h.isActive) return false;
    const createdDate = getEntityLocalDate(h.createdAt);
    return createdDate <= endDate;
  });

  const habitMetrics: HabitConsistencyMetrics[] = [];
  let totalScheduled = 0;
  let totalCompleted = 0;

  for (const habit of eligibleHabits) {
    const habitCreatedDate = getEntityLocalDate(habit.createdAt);
    const effectiveStart = habitCreatedDate > startDate ? habitCreatedDate : startDate;

    // Completed dates set for this habit
    const completedDates = new Set(
      habitLogs
        .filter((l) => l.habitId === habit.id && l.completed)
        .map((l) => l.date)
    );

    let scheduledCount = 0;
    let completedCount = 0;

    if (effectiveStart <= endDate) {
      if (habit.frequency === "weekly") {
        // Find unique calendar week Mondays falling in effective window
        const allDays = getDateList(effectiveStart, endDate);
        const uniqueWeekMondays = Array.from(new Set(allDays.map((d) => getWeekMonday(d))));
        scheduledCount = uniqueWeekMondays.length;

        // Count how many unique weeks have at least 1 completed log
        const completedWeeks = new Set(
          Array.from(completedDates).map((d) => getWeekMonday(d))
        );
        completedCount = uniqueWeekMondays.filter((m) => completedWeeks.has(m)).length;
      } else {
        // Day-based frequencies: daily, weekdays, custom
        const candidateDays = getDateList(effectiveStart, endDate);
        const scheduledDays = candidateDays.filter((d) =>
          isScheduledDay(d, habit.frequency, habit.customDays)
        );
        scheduledCount = scheduledDays.length;
        completedCount = scheduledDays.filter((d) => completedDates.has(d)).length;
      }
    }

    const consistencyRate =
      scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 1000) / 10 : 0;

    habitMetrics.push({
      habitId: habit.id,
      title: habit.title,
      frequency: habit.frequency,
      isActive: habit.isActive,
      scheduledCount,
      completedCount,
      consistencyRate,
    });

    totalScheduled += scheduledCount;
    totalCompleted += completedCount;
  }

  const overallConsistencyRate =
    totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 1000) / 10 : 0;

  return {
    totalScheduled,
    totalCompleted,
    consistencyRate: overallConsistencyRate,
    habits: habitMetrics,
  };
}

/**
 * Calculates current and best streaks for each habit and global leaders.
 * Reuses existing tested `calculateStreak()` utility.
 */
export function calculateHabitStreaks(
  habits: Habit[],
  habitLogs: HabitLog[]
): GlobalStreakMetrics {
  const habitMetrics: HabitStreakMetrics[] = [];
  let longestCurrentStreak = 0;
  let longestCurrentHabit: HabitStreakMetrics | null = null;
  let bestAllTimeStreak = 0;
  let bestAllTimeHabit: HabitStreakMetrics | null = null;

  for (const habit of habits) {
    const completedDates = habitLogs
      .filter((l) => l.habitId === habit.id && l.completed)
      .map((l) => l.date);

    const { currentStreak, bestStreak } = calculateStreak(
      completedDates,
      habit.frequency,
      habit.customDays
    );

    const metric: HabitStreakMetrics = {
      habitId: habit.id,
      title: habit.title,
      frequency: habit.frequency,
      isActive: habit.isActive,
      currentStreak,
      bestStreak,
    };

    habitMetrics.push(metric);

    // Track active habits for longest current streak leader
    if (habit.isActive && currentStreak > longestCurrentStreak) {
      longestCurrentStreak = currentStreak;
      longestCurrentHabit = metric;
    }

    if (bestStreak > bestAllTimeStreak) {
      bestAllTimeStreak = bestStreak;
      bestAllTimeHabit = metric;
    }
  }

  return {
    longestCurrentStreak,
    longestCurrentHabit,
    bestAllTimeStreak,
    bestAllTimeHabit,
    habits: habitMetrics,
  };
}

/**
 * Identifies whether a task represents a goal based on category or tags.
 */
export function isGoalTask(task: Task): boolean {
  if (task.category && task.category.trim().toLowerCase() === "goal") {
    return true;
  }
  if (Array.isArray(task.tags) && task.tags.some((t) => t.trim().toLowerCase() === "goal")) {
    return true;
  }
  return false;
}

/**
 * Calculates progress for goal-categorized tasks:
 * - Excludes archived goals from denominators.
 * - Handles zero goals without NaN.
 */
export function getGoalProgress(tasks: Task[]): GoalProgressMetrics {
  const goalTasks = tasks.filter((t) => isGoalTask(t) && t.status !== "archived");
  const totalGoals = goalTasks.length;

  let completedGoals = 0;
  let pendingGoals = 0;
  const goalItems: GoalItemProgress[] = [];

  for (const goal of goalTasks) {
    if (goal.status === "completed") {
      completedGoals++;
    } else {
      pendingGoals++;
    }

    goalItems.push({
      id: goal.id,
      title: goal.title,
      status: goal.status,
      priority: goal.priority,
      dueDate: goal.dueDate,
      completedAt: goal.completedAt,
    });
  }

  const progressPercentage =
    totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 1000) / 10 : 0;

  return {
    totalGoals,
    completedGoals,
    pendingGoals,
    progressPercentage,
    goals: goalItems,
  };
}

/**
 * Computes category and priority distributions for non-archived tasks.
 */
export function getTaskDistributions(tasks: Task[]): TaskDistributions {
  const activeTasks = tasks.filter((t) => t.status !== "archived");
  const totalEligibleTasks = activeTasks.length;

  // Category distribution
  const catMap = new Map<string, { total: number; completed: number; pending: number }>();
  for (const task of activeTasks) {
    const cat = (task.category || "task").trim().toLowerCase();
    const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
    const existing = catMap.get(formattedCat) || { total: 0, completed: 0, pending: 0 };
    existing.total++;
    if (task.status === "completed") {
      existing.completed++;
    } else {
      existing.pending++;
    }
    catMap.set(formattedCat, existing);
  }

  const byCategory: CategoryDistributionItem[] = Array.from(catMap.entries())
    .map(([category, stats]) => ({
      category,
      totalCount: stats.total,
      completedCount: stats.completed,
      pendingCount: stats.pending,
      percentageOfTotal:
        totalEligibleTasks > 0
          ? Math.round((stats.total / totalEligibleTasks) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  // Priority distribution
  const priorityOrder: Array<"high" | "medium" | "low"> = ["high", "medium", "low"];
  const prioMap = new Map<"high" | "medium" | "low", { total: number; completed: number; pending: number }>();
  for (const p of priorityOrder) {
    prioMap.set(p, { total: 0, completed: 0, pending: 0 });
  }

  for (const task of activeTasks) {
    const prio = task.priority || "medium";
    const existing = prioMap.get(prio) || { total: 0, completed: 0, pending: 0 };
    existing.total++;
    if (task.status === "completed") {
      existing.completed++;
    } else {
      existing.pending++;
    }
    prioMap.set(prio, existing);
  }

  const byPriority: PriorityDistributionItem[] = priorityOrder.map((prio) => {
    const stats = prioMap.get(prio) || { total: 0, completed: 0, pending: 0 };
    return {
      priority: prio,
      totalCount: stats.total,
      completedCount: stats.completed,
      pendingCount: stats.pending,
      percentageOfTotal:
        totalEligibleTasks > 0
          ? Math.round((stats.total / totalEligibleTasks) * 1000) / 10
          : 0,
    };
  });

  return {
    byCategory,
    byPriority,
    totalEligibleTasks,
  };
}

/**
 * Calculates period-over-period percentage change:
 * - When previous is null (e.g. All Time), returns null comparison without misleading percentages.
 * - Handles zero previous baseline without NaN or Infinity.
 */
export function calculatePeriodChange(
  current: number,
  previous: number | null
): PeriodComparison {
  if (previous === null) {
    return {
      current,
      previous: null,
      absoluteChange: null,
      percentageChange: null,
      trend: "none",
    };
  }

  const absoluteChange = current - previous;

  if (previous === 0) {
    if (current === 0) {
      return {
        current,
        previous: 0,
        absoluteChange: 0,
        percentageChange: 0,
        trend: "neutral",
      };
    }
    // Growth from 0: standard benchmark is +100%
    return {
      current,
      previous: 0,
      absoluteChange,
      percentageChange: 100,
      trend: "up",
    };
  }

  const percentageChange = Math.round((absoluteChange / previous) * 1000) / 10;
  const trend = percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "neutral";

  return {
    current,
    previous,
    absoluteChange,
    percentageChange,
    trend,
  };
}

/**
 * Returns recent completed accomplishments (tasks and goals),
 * ordered newest to oldest, optionally filtered by a date window.
 */
export function getRecentAccomplishments(
  tasks: Task[],
  limit = 20,
  dateRange?: { startDate: string; endDate: string }
): AccomplishmentItem[] {
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const accomplishments: AccomplishmentItem[] = [];

  for (const task of completedTasks) {
    const date = getTaskCompletionDate(task);
    if (!date) continue;

    if (dateRange) {
      if (date < dateRange.startDate || date > dateRange.endDate) {
        continue;
      }
    }

    const rawTimestamp = task.completedAt || task.updatedAt || date;

    accomplishments.push({
      id: task.id,
      type: isGoalTask(task) ? "goal" : "task",
      title: task.title,
      completedAt: rawTimestamp,
      completedDate: date,
      category: task.category || "task",
      priority: task.priority || "medium",
    });
  }

  accomplishments.sort((a, b) => {
    // Sort descending by timestamp or date
    return b.completedAt.localeCompare(a.completedAt);
  });

  return accomplishments.slice(0, limit);
}

/**
 * High-level pure aggregator that produces a complete analytics snapshot
 * for the given date range. Keeps task metrics and habit metrics strictly separate.
 */
export function calculateAnalyticsSnapshot(params: {
  rangeType: DateRangeType;
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  today?: string;
  accomplishmentLimit?: number;
}): AnalyticsSnapshot {
  const { rangeType, tasks, habits, habitLogs, today = getLocalDateString(), accomplishmentLimit = 20 } = params;

  // Find earliest recorded date across tasks, habits, and habit logs for "all" range
  let earliestDate: string | undefined = undefined;
  for (const t of tasks) {
    const d = getEntityLocalDate(t.createdAt);
    if (!earliestDate || d < earliestDate) earliestDate = d;
  }
  for (const h of habits) {
    const d = getEntityLocalDate(h.createdAt);
    if (!earliestDate || d < earliestDate) earliestDate = d;
  }
  for (const l of habitLogs) {
    if (l.date && (!earliestDate || l.date < earliestDate)) earliestDate = l.date;
  }

  const range = resolveDateRange(rangeType, { today, earliestDate });

  // Task overview & completions
  const taskOverview = getTaskOverviewMetrics(tasks, today);
  const tasksCompletedInRange = getTasksCompletedInRange(tasks, range.startDate, range.endDate);

  // Period-over-period task comparisons
  let prevTasksCompleted: number | null = null;
  if (range.previousStartDate && range.previousEndDate) {
    prevTasksCompleted = getTasksCompletedInRange(tasks, range.previousStartDate, range.previousEndDate);
  }
  const taskPeriodComparison = calculatePeriodChange(tasksCompletedInRange, prevTasksCompleted);

  // Habit metrics in range
  const habitsCompletedInRange = getHabitsCompletedInRange(habitLogs, range.startDate, range.endDate, habits);
  let prevHabitsCompleted: number | null = null;
  if (range.previousStartDate && range.previousEndDate) {
    prevHabitsCompleted = getHabitsCompletedInRange(habitLogs, range.previousStartDate, range.previousEndDate, habits);
  }
  const habitPeriodComparison = calculatePeriodChange(habitsCompletedInRange, prevHabitsCompleted);

  // Daily aggregations
  const dailyTaskCompletions = getDailyTaskCompletions(tasks, range.startDate, range.endDate);
  const dailyHabitCompletions = getDailyHabitCompletions(habitLogs, range.startDate, range.endDate, habits);

  // Consistency & streaks
  const habitConsistency = calculateHabitConsistency({
    habits,
    habitLogs,
    startDate: range.startDate,
    endDate: range.endDate,
    includeInactive: true,
  });
  const habitStreaks = calculateHabitStreaks(habits, habitLogs);

  // Goals & distributions
  const goalProgress = getGoalProgress(tasks);
  const distributions = getTaskDistributions(tasks);

  // Accomplishments
  const recentAccomplishments = getRecentAccomplishments(
    tasks,
    accomplishmentLimit,
    rangeType === "all" ? undefined : { startDate: range.startDate, endDate: range.endDate }
  );

  return {
    range,
    taskOverview,
    tasksCompletedInRange,
    habitsCompletedInRange,
    taskPeriodComparison,
    habitPeriodComparison,
    dailyTaskCompletions,
    dailyHabitCompletions,
    habitConsistency,
    habitStreaks,
    goalProgress,
    distributions,
    recentAccomplishments,
  };
}

