import { z } from "zod";

export const ThemePersonalitySchema = z.enum([
  "archivist",
  "futuristic",
  "aesthetic",
  "artistic",
  "minimalist",
  "naturalist",
  "midnight",
]);

export type ThemePersonality = z.infer<typeof ThemePersonalitySchema>;

export const DEFAULT_THEME_PERSONALITY: ThemePersonality = "archivist";

export interface ThemePersonalityMeta {
  id: ThemePersonality;
  name: string;
  tagline: string;
  description: string;
  swatches: {
    bg: string;
    surface: string;
    accent: string;
    secondary: string;
  };
}

export const THEME_PERSONALITIES: readonly ThemePersonalityMeta[] = [
  {
    id: "archivist",
    name: "Archivist",
    tagline: "Quiet Desk & Paper Editorial",
    description: "Warm paper backgrounds, layered stationery surfaces, botanical pine, and mineral teal.",
    swatches: {
      bg: "#f6f5f1",
      surface: "#fcfbf8",
      accent: "#2c5e4f",
      secondary: "#366c75",
    },
  },
  {
    id: "futuristic",
    name: "Futuristic",
    tagline: "Neo-Cybernetic & Tech Glow",
    description: "Cool obsidian and titanium canvas, electric cyber cyan, neon violet, and sharp precision.",
    swatches: {
      bg: "#f0f4f8",
      surface: "#ffffff",
      accent: "#0284c7",
      secondary: "#7c3aed",
    },
  },
  {
    id: "aesthetic",
    name: "Aesthetic",
    tagline: "Soft Pastel Dream",
    description: "Delicate blush and linen tones, soft terracotta rose, gentle lavender, and airy calm.",
    swatches: {
      bg: "#fbf7f5",
      surface: "#ffffff",
      accent: "#d45d79",
      secondary: "#9f7aea",
    },
  },
  {
    id: "artistic",
    name: "Artistic",
    tagline: "Creative Studio & Pigment",
    description: "Raw gesso canvas, warm studio desks, cadmium ochre pigment, and expressive cobalt ink.",
    swatches: {
      bg: "#faf6ed",
      surface: "#ffffff",
      accent: "#d97706",
      secondary: "#2563eb",
    },
  },
  {
    id: "minimalist",
    name: "Minimalist",
    tagline: "Monochrome Bauhaus",
    description: "High-contrast architectural stark canvas, pitch black ink, and hairline structural borders.",
    swatches: {
      bg: "#ffffff",
      surface: "#f5f5f5",
      accent: "#171717",
      secondary: "#737373",
    },
  },
  {
    id: "naturalist",
    name: "Naturalist",
    tagline: "Botanical Forest & Moss",
    description: "Organic earth paper, woodland moss, deep evergreen canopy, and warm bark olive accents.",
    swatches: {
      bg: "#f3f6f1",
      surface: "#fafcf8",
      accent: "#235c3b",
      secondary: "#556b2f",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    tagline: "Cosmic Indigo & Starlight",
    description: "Deep celestial twilight sky, starlight indigo, aurora violet, and crisp icy silver accents.",
    swatches: {
      bg: "#0c0f1d",
      surface: "#13172c",
      accent: "#6366f1",
      secondary: "#38bdf8",
    },
  },
] as const;

export const SettingsSchema = z.object({
  id:                  z.literal("user_settings"),
  theme:               z.enum(["light", "dark", "system"]).default("system"),
  themePersonality:    ThemePersonalitySchema.default(DEFAULT_THEME_PERSONALITY),
  defaultPriority:     z.enum(["low", "medium", "high"]).default("medium"),
  defaultReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default("09:00"),
  weekStartsOn:        z.enum(["sunday", "monday"]).default("monday"),
  dateFormat:          z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  notificationsEnabled: z.boolean().default(true),
  heatmapDays:         z.number().min(30).max(365).default(180),
  lastBackupAt:        z.string().datetime().optional(),
  schemaVersion:       z.number().int().default(1),
  updatedAt:           z.string().datetime(),
});

export type Settings = z.infer<typeof SettingsSchema>;

