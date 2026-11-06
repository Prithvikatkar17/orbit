import { z } from "zod";

export const SettingsSchema = z.object({
  id:                  z.literal("user_settings"),
  theme:               z.enum(["light", "dark", "system"]).default("system"),
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

