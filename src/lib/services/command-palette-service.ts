import { db } from "../db/client.ts";
import { flushSyncQueue } from "./sync-queue-service.ts";
import { syncSettingsToSQLite } from "./vault-sync-service.ts";
import { type ThemePersonality } from "../schemas/settings.ts";

export interface CommandContext {
  router: { push: (route: string) => void };
  setThemePersonality: (personality: ThemePersonality) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  currentTheme?: string;
  closePalette: () => void;
  openQuickCapture?: (data?: {
    defaultTab?: string;
    title?: string;
    notes?: string;
    link?: string;
    category?: string;
  }) => void;
}

export interface CommandPaletteItem {
  id: string;
  category: "Navigation" | "Theme Personality" | "Appearance" | "Data & Vault" | "Actions";
  title: string;
  description: string;
  keywords: string[];
  shortcutHint?: string;
  run: (ctx: CommandContext) => void | Promise<void>;
}

export const COMMAND_PALETTE_ITEMS: CommandPaletteItem[] = [
  // Navigation
  {
    id: "nav-home",
    category: "Navigation",
    title: "Go to Dashboard",
    description: "Personal focus dashboard, schedule overview, and active habits",
    keywords: ["home", "dashboard", "overview"],
    shortcutHint: "g d",
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/");
    },
  },
  {
    id: "nav-inbox",
    category: "Navigation",
    title: "Go to Inbox",
    description: "Capture buffer and one-click triage workspace",
    keywords: ["inbox", "capture", "thoughts", "triage"],
    shortcutHint: "g i",
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/inbox");
    },
  },
  {
    id: "nav-tasks",
    category: "Navigation",
    title: "Go to Tasks",
    description: "Task ledger with priority, due dates, and custom reordering",
    keywords: ["tasks", "todos", "list", "priorities"],
    shortcutHint: "g t",
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/tasks");
    },
  },
  {
    id: "nav-habits",
    category: "Navigation",
    title: "Go to Habits",
    description: "Habit streaks, consistency heatmaps, and daily tracking",
    keywords: ["habits", "routines", "streaks", "heatmap"],
    shortcutHint: "g h",
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/habits");
    },
  },
  {
    id: "nav-calendar",
    category: "Navigation",
    title: "Go to Calendar",
    description: "Month, week, and day agenda views with recurrence",
    keywords: ["calendar", "events", "agenda", "schedule"],
    shortcutHint: "g c",
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/calendar");
    },
  },
  {
    id: "nav-expenses",
    category: "Navigation",
    title: "Go to Expenses",
    description: "Daily expense tracker, budget pacing, and spending ledger",
    keywords: ["expenses", "money", "budget", "spend", "ledger", "finance"],
    shortcutHint: "g e",
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/expenses");
    },
  },
  {
    id: "nav-library",
    category: "Navigation",
    title: "Go to Library",
    description: "Curated personal repository for notes, bookmarks, and files",
    keywords: ["library", "bookmarks", "books", "reading", "notes"],
    shortcutHint: "g l",
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/library");
    },
  },
  {
    id: "nav-insights",
    category: "Navigation",
    title: "Go to Insights",
    description: "Analytics, productivity telemetry, and completion trends",
    keywords: ["insights", "analytics", "stats", "charts", "metrics"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/insights");
    },
  },
  {
    id: "nav-settings",
    category: "Navigation",
    title: "Go to Settings",
    description: "Theme personalities, notification permissions, and database backup",
    keywords: ["settings", "preferences", "config", "backup"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.router.push("/settings");
    },
  },

  // Theme Personalities
  {
    id: "theme-archivist",
    category: "Theme Personality",
    title: "Switch to Archivist Personality",
    description: "The Bodleian Rare Book Folio & Curatorial Card Catalog",
    keywords: ["theme", "personality", "archivist", "rare", "book", "folio", "paper"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.setThemePersonality("archivist");
    },
  },
  {
    id: "theme-minimalist",
    category: "Theme Personality",
    title: "Switch to Minimalist Personality",
    description: "Swiss High-Modernist Ledger & Vignelli Grid",
    keywords: ["theme", "personality", "minimalist", "swiss", "brutalist", "vignelli"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.setThemePersonality("minimalist");
    },
  },
  {
    id: "theme-futuristic",
    category: "Theme Personality",
    title: "Switch to Futuristic Personality",
    description: "Monolithic Cyber-Tactical Command Deck",
    keywords: ["theme", "personality", "futuristic", "cyber", "neon", "avionics", "console"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.setThemePersonality("futuristic");
    },
  },
  {
    id: "theme-naturalist",
    category: "Theme Personality",
    title: "Switch to Naturalist Personality",
    description: "Kew Botanical Conservatory Herbarium & Field Journal",
    keywords: ["theme", "personality", "naturalist", "botanical", "herbarium", "green"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.setThemePersonality("naturalist");
    },
  },
  {
    id: "theme-midnight",
    category: "Theme Personality",
    title: "Switch to Midnight Personality",
    description: "Mount Palomar Celestial Ephemeris & Deep Indigo Starlight",
    keywords: ["theme", "personality", "midnight", "indigo", "stars", "ephemeris", "astronomy"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.setThemePersonality("midnight");
    },
  },
  {
    id: "theme-aesthetic",
    category: "Theme Personality",
    title: "Switch to Aesthetic Personality",
    description: "Cereal / Kinfolk Museum Editorial Spread",
    keywords: ["theme", "personality", "aesthetic", "kinfolk", "editorial", "terracotta", "cereal"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.setThemePersonality("aesthetic");
    },
  },
  {
    id: "theme-artistic",
    category: "Theme Personality",
    title: "Switch to Artistic Personality",
    description: "Chromatic Atelier & Pigment Workshop",
    keywords: ["theme", "personality", "artistic", "atelier", "chromatic", "amber", "studio"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.setThemePersonality("artistic");
    },
  },

  // Appearance
  {
    id: "appearance-dark",
    category: "Appearance",
    title: "Switch to Dark Mode",
    description: "Enable dark theme appearance across all views",
    keywords: ["dark", "night", "black", "mode", "appearance"],
    run: async (ctx) => {
      ctx.closePalette();
      ctx.setTheme("dark");
      try {
        const existing = await db.settings.get("user_settings");
        if (existing) {
          await db.settings.update("user_settings", {
            theme: "dark",
            updatedAt: new Date().toISOString(),
          });
          void syncSettingsToSQLite();
        }
      } catch {}
    },
  },
  {
    id: "appearance-light",
    category: "Appearance",
    title: "Switch to Light Mode",
    description: "Enable light theme appearance across all views",
    keywords: ["light", "day", "white", "mode", "appearance"],
    run: async (ctx) => {
      ctx.closePalette();
      ctx.setTheme("light");
      try {
        const existing = await db.settings.get("user_settings");
        if (existing) {
          await db.settings.update("user_settings", {
            theme: "light",
            updatedAt: new Date().toISOString(),
          });
          void syncSettingsToSQLite();
        }
      } catch {}
    },
  },
  {
    id: "appearance-toggle",
    category: "Appearance",
    title: "Toggle Dark / Light Mode",
    description: "Invert current appearance mode",
    keywords: ["toggle", "theme", "mode", "appearance", "switch"],
    run: async (ctx) => {
      ctx.closePalette();
      const nextTheme = ctx.currentTheme === "dark" ? "light" : "dark";
      ctx.setTheme(nextTheme);
      try {
        const existing = await db.settings.get("user_settings");
        if (existing) {
          await db.settings.update("user_settings", {
            theme: nextTheme,
            updatedAt: new Date().toISOString(),
          });
          void syncSettingsToSQLite();
        }
      } catch {}
    },
  },

  // Data & Vault
  {
    id: "data-export-vault",
    category: "Data & Vault",
    title: "Export SQLite Data Vault",
    description: "Flush offline sync queue and download atomic orbit.sqlite snapshot",
    keywords: ["export", "backup", "vault", "sqlite", "download"],
    run: async (ctx) => {
      ctx.closePalette();
      try {
        await flushSyncQueue();
        if (typeof window !== "undefined") {
          const a = document.createElement("a");
          a.href = "/api/backup/sqlite";
          a.download = `orbit-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error("Vault export failed:", err);
      }
    },
  },

  // Actions
  {
    id: "action-quick-capture",
    category: "Actions",
    title: "Open Quick Capture",
    description: "Quickly capture a note, task, or link from anywhere",
    keywords: ["capture", "quick", "note", "new", "thought"],
    shortcutHint: "⌘N",
    run: (ctx) => {
      ctx.closePalette();
      ctx.openQuickCapture?.();
    },
  },
  {
    id: "action-log-expense",
    category: "Actions",
    title: "Log Expense",
    description: "Open Quick Capture directly on the Expense tab",
    keywords: ["expense", "log", "spend", "money", "inr", "upi", "capture"],
    run: (ctx) => {
      ctx.closePalette();
      ctx.openQuickCapture?.({ defaultTab: "expense" });
    },
  },
];

export function filterCommandPalette(rawQuery: string): CommandPaletteItem[] {
  const query = rawQuery.startsWith(">")
    ? rawQuery.slice(1).trim().toLowerCase()
    : rawQuery.trim().toLowerCase();

  if (!query) {
    return COMMAND_PALETTE_ITEMS;
  }

  return COMMAND_PALETTE_ITEMS.filter((item) => {
    if (item.title.toLowerCase().includes(query)) return true;
    if (item.category.toLowerCase().includes(query)) return true;
    if (item.description.toLowerCase().includes(query)) return true;
    if (item.keywords.some((k) => k.includes(query))) return true;
    return false;
  });
}
