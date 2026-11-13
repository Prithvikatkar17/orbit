export const DEFAULT_CATEGORIES = [
  { name: "Inbox", icon: "📥", color: "#57564c", module: "inbox" as const },
  { name: "Task", icon: "📌", color: "#2c5e4f", module: "task" as const },
  { name: "Goal", icon: "🎯", color: "#366c75", module: "task" as const },
  { name: "Idea", icon: "💡", color: "#a86214", module: "task" as const },
  { name: "Bookmark", icon: "🔖", color: "#2c5e4f", module: "library" as const },
  { name: "Article", icon: "📰", color: "#2f7a57", module: "library" as const },
  { name: "Video", icon: "📹", color: "#b8403a", module: "library" as const },
  { name: "Note", icon: "📝", color: "#57564c", module: "library" as const },
  { name: "Watch", icon: "🎬", color: "#366c75", module: "library" as const },
  { name: "YouTube", icon: "▶️", color: "#b8403a", module: "library" as const },
  { name: "Learn", icon: "📚", color: "#2f7a57", module: "library" as const },
  { name: "Buy", icon: "🛒", color: "#a86214", module: "library" as const },
  { name: "Habit", icon: "🌱", color: "#2f7a57", module: "habit" as const },
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
  bookmark: "🔖",
  video: "📹",
  playlist: "📑",
  article: "📰",
  note: "📝",
  file: "📎",
};

export const EVENT_TYPES = [
  { id: "birthday", label: "Birthday", icon: "🎂", color: "#b8403a", badgeClass: "bg-orbit-danger-soft text-orbit-danger" },
  { id: "anniversary", label: "Anniversary", icon: "💍", color: "#366c75", badgeClass: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary" },
  { id: "assignment", label: "Assignment", icon: "📝", color: "#2c5e4f", badgeClass: "bg-orbit-accent-soft text-orbit-accent" },
  { id: "deadline", label: "Deadline", icon: "⏰", color: "#b8403a", badgeClass: "bg-orbit-danger-soft text-orbit-danger" },
  { id: "meeting", label: "Meeting", icon: "👥", color: "#2f7a57", badgeClass: "bg-orbit-success-soft text-orbit-success" },
  { id: "personal", label: "Personal", icon: "👤", color: "#366c75", badgeClass: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary" },
  { id: "other", label: "Other", icon: "📌", color: "#57564c", badgeClass: "bg-orbit-surface-secondary text-orbit-text-secondary" },
] as const;

export const EVENT_TYPE_MAP: Record<
  string,
  { label: string; icon: string; color: string; badgeClass: string }
> = {
  birthday: { label: "Birthday", icon: "🎂", color: "#b8403a", badgeClass: "bg-orbit-danger-soft text-orbit-danger" },
  anniversary: { label: "Anniversary", icon: "💍", color: "#366c75", badgeClass: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary" },
  assignment: { label: "Assignment", icon: "📝", color: "#2c5e4f", badgeClass: "bg-orbit-accent-soft text-orbit-accent" },
  deadline: { label: "Deadline", icon: "⏰", color: "#b8403a", badgeClass: "bg-orbit-danger-soft text-orbit-danger" },
  meeting: { label: "Meeting", icon: "👥", color: "#2f7a57", badgeClass: "bg-orbit-success-soft text-orbit-success" },
  personal: { label: "Personal", icon: "👤", color: "#366c75", badgeClass: "bg-orbit-accent-secondary-soft text-orbit-accent-secondary" },
  holiday: { label: "Holiday", icon: "🏖️", color: "#a86214", badgeClass: "bg-orbit-warning-soft text-orbit-warning" },
  milestone: { label: "Milestone", icon: "🚩", color: "#2c5e4f", badgeClass: "bg-orbit-accent-soft text-orbit-accent" },
  general: { label: "General", icon: "📅", color: "#57564c", badgeClass: "bg-orbit-surface-secondary text-orbit-text-secondary" },
  other: { label: "Other", icon: "📌", color: "#57564c", badgeClass: "bg-orbit-surface-secondary text-orbit-text-secondary" },
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

export const MAX_LIBRARY_FILE_SIZE = 20 * 1024 * 1024; // 20 MB in bytes
