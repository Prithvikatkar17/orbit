import { z } from "zod";

export const EventSchema = z.object({
  id:           z.string().uuid(),
  title:        z.string().min(1).max(500),
  notes:        z.string().max(5000).default(""),
  type:         z.enum([
    "general",
    "birthday",
    "anniversary",
    "deadline",
    "holiday",
    "milestone",
  ]).default("general"),
  date:         z.string(), // "YYYY-MM-DD"
  startTime:    z.string().optional(), // "HH:mm"
  endTime:      z.string().optional(), // "HH:mm"
  isAllDay:     z.boolean().default(true),
  recurrence:   z.object({
    rule:       z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
    endDate:    z.string().optional(), // "YYYY-MM-DD"
  }).default({ rule: "none" }),
  color:        z.string().optional(),
  sourceItemId: z.string().uuid().optional(),
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
});

export type Event = z.infer<typeof EventSchema>;

