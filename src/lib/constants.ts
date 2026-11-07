export const DEFAULT_CATEGORIES = [
  { name: "Inbox", icon: "📥", color: "#64748b", module: "inbox" as const },
  { name: "Task", icon: "📌", color: "#6366f1", module: "task" as const },
  { name: "Goal", icon: "🎯", color: "#ec4899", module: "task" as const },
  { name: "Idea", icon: "💡", color: "#f59e0b", module: "task" as const },
  { name: "Watch", icon: "🎬", color: "#8b5cf6", module: "library" as const },
  { name: "YouTube", icon: "▶️", color: "#ef4444", module: "library" as const },
  { name: "Learn", icon: "📚", color: "#10b981", module: "library" as const },
  { name: "Buy", icon: "🛒", color: "#06b6d4", module: "library" as const },
  { name: "Habit", icon: "🌱", color: "#22c55e", module: "habit" as const },
];

export const CATEGORY_ICONS: Record<string, string> = {
  Inbox: "📥",
  Task: "📌",
  Goal: "🎯",
  Idea: "💡",
  Watch: "🎬",
  YouTube: "▶️",
  Learn: "📚",
  Buy: "🛒",
  Habit: "🌱",
  inbox: "📥",
  task: "📌",
  goal: "🎯",
  idea: "💡",
  watch: "🎬",
  read: "📖",
  listen: "🎧",
  learn: "📚",
  buy: "🛒",
  habit: "🌱",
};

export const EVENT_TYPES = [
  { id: "birthday", label: "Birthday", icon: "🎂", color: "#ec4899", badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300" },
  { id: "anniversary", label: "Anniversary", icon: "💍", color: "#8b5cf6", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  { id: "assignment", label: "Assignment", icon: "📝", color: "#3b82f6", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { id: "deadline", label: "Deadline", icon: "⏰", color: "#ef4444", badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  { id: "meeting", label: "Meeting", icon: "👥", color: "#10b981", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { id: "personal", label: "Personal", icon: "👤", color: "#06b6d4", badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  { id: "other", label: "Other", icon: "📌", color: "#64748b", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
] as const;

export const EVENT_TYPE_MAP: Record<
  string,
  { label: string; icon: string; color: string; badgeClass: string }
> = {
  birthday: { label: "Birthday", icon: "🎂", color: "#ec4899", badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300" },
  anniversary: { label: "Anniversary", icon: "💍", color: "#8b5cf6", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  assignment: { label: "Assignment", icon: "📝", color: "#3b82f6", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  deadline: { label: "Deadline", icon: "⏰", color: "#ef4444", badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  meeting: { label: "Meeting", icon: "👥", color: "#10b981", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  personal: { label: "Personal", icon: "👤", color: "#06b6d4", badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  holiday: { label: "Holiday", icon: "🏖️", color: "#f59e0b", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  milestone: { label: "Milestone", icon: "🚩", color: "#6366f1", badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  general: { label: "General", icon: "📅", color: "#64748b", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  other: { label: "Other", icon: "📌", color: "#64748b", badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

export const REMINDER_PRESETS = [
  { label: "At time of event", type: "at_time" as const, offsetMinutes: 0 },
  { label: "15 minutes before", type: "before" as const, offsetMinutes: 15 },
  { label: "30 minutes before", type: "before" as const, offsetMinutes: 30 },
  { label: "1 hour before", type: "before" as const, offsetMinutes: 60 },
  { label: "1 day before", type: "before" as const, offsetMinutes: 1440 },
  { label: "3 days before", type: "before" as const, offsetMinutes: 4320 },
  { label: "7 days before", type: "before" as const, offsetMinutes: 10080 },
];
