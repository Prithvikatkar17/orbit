export const DEFAULT_CATEGORIES = [
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
  Task: "📌",
  Goal: "🎯",
  Idea: "💡",
  Watch: "🎬",
  YouTube: "▶️",
  Learn: "📚",
  Buy: "🛒",
  Habit: "🌱",
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

