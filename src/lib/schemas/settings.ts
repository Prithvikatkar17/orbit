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
    tagline: "Bodleian Rare Book Folio & Card Catalog",
    description: "Cotton rag paper, Oxford hunter green, oxblood wax seals, and warm brass hardware.",
    swatches: {
      bg: "#f4efe4",
      surface: "#1c2e24",
      accent: "#1b4332",
      secondary: "#8c2d38",
    },
  },
  {
    id: "futuristic",
    name: "Futuristic",
    tagline: "Linear & Hardware Sequencer Console",
    description: "Anodized titanium, telemetry OLED panels, electric signal cyan, and precision amber.",
    swatches: {
      bg: "#050811",
      surface: "#0c1624",
      accent: "#00f0ff",
      secondary: "#ffb000",
    },
  },
  {
    id: "aesthetic",
    name: "Aesthetic",
    tagline: "Kinfolk & Museum Editorial Spread",
    description: "Warm alabaster paper, museum double-hairline rules, terracotta accents, and espresso ink.",
    swatches: {
      bg: "#fdfbf7",
      surface: "#f7f2ea",
      accent: "#c86d51",
      secondary: "#2c221e",
    },
  },
  {
    id: "artistic",
    name: "Artistic",
    tagline: "Chromatic Watercolor & Gouache Atelier",
    description: "Cold-pressed watercolor wash, studio gesso, ultramarine pigments, and vermilion coral.",
    swatches: {
      bg: "#fdfaf6",
      surface: "#ffffff",
      accent: "#4f46e5",
      secondary: "#f43f5e",
    },
  },
  {
    id: "minimalist",
    name: "Minimalist",
    tagline: "Dieter Rams & Vignelli Architectural Ledger",
    description: "Matte alabaster, pitch black carbon ink, Swiss typography, and Braun signal orange.",
    swatches: {
      bg: "#ffffff",
      surface: "#f5f5f5",
      accent: "#ff3b00",
      secondary: "#111110",
    },
  },
  {
    id: "naturalist",
    name: "Naturalist",
    tagline: "Living Biophilic Sanctuary & Terraced Landscape",
    description: "Sunlit limestone, deep canopy forest evergreen, living terrariums, and terracotta clay.",
    swatches: {
      bg: "#f4f6f0",
      surface: "#0a1811",
      accent: "#1b3826",
      secondary: "#b85a3a",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    tagline: "Celestial Observatory & Horological Astrolabe",
    description: "Cosmic obsidian canvas, astrolabe horological brass, celestial indigo, and starlight vectors.",
    swatches: {
      bg: "#060813",
      surface: "#0c1024",
      accent: "#818cf8",
      secondary: "#d4af37",
    },
  },
] as const;

export const ONBOARDING_CURRENT_VERSION = 1;

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
  onboardingCompletedVersion: z.number().int().optional(),
  onboardingCompletedAt: z.string().datetime().optional(),
  updatedAt:           z.string().datetime(),
});

export type Settings = z.infer<typeof SettingsSchema>;

