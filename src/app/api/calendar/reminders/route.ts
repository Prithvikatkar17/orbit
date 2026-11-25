import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ReminderSchema } from "@/lib/schemas/reminder";

function parseEpoch(val: unknown, fallback: number = Date.now()): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export async function GET() {
  try {
    const allReminders = await db
      .select()
      .from(reminders)
      .orderBy(desc(reminders.createdAt));

    return NextResponse.json({ success: true, reminders: allReminders });
  } catch (error) {
    console.error("Failed to fetch reminders from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();
    const id = body.id || crypto.randomUUID();

    const timingInput =
      typeof body.timing === "string" ? JSON.parse(body.timing) : body.timing;

    const validated = ReminderSchema.parse({
      id,
      eventId: body.eventId,
      timing: timingInput,
      label: body.label || undefined,
      lastNotifiedOccurrenceDate: body.lastNotifiedOccurrenceDate || undefined,
      notifiedAt:
        typeof body.notifiedAt === "number"
          ? new Date(body.notifiedAt).toISOString()
          : body.notifiedAt || undefined,
      acknowledgedAt:
        typeof body.acknowledgedAt === "number"
          ? new Date(body.acknowledgedAt).toISOString()
          : body.acknowledgedAt || undefined,
      snoozedUntil:
        typeof body.snoozedUntil === "number"
          ? new Date(body.snoozedUntil).toISOString()
          : body.snoozedUntil || undefined,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      createdAt:
        typeof body.createdAt === "number"
          ? new Date(body.createdAt).toISOString()
          : body.createdAt || nowIso,
    });

    const row = {
      id: validated.id,
      eventId: validated.eventId,
      timing: JSON.stringify(validated.timing),
      label: validated.label || null,
      lastNotifiedOccurrenceDate: validated.lastNotifiedOccurrenceDate || null,
      notifiedAt: validated.notifiedAt ? parseEpoch(validated.notifiedAt) : null,
      acknowledgedAt: validated.acknowledgedAt
        ? parseEpoch(validated.acknowledgedAt)
        : null,
      snoozedUntil: validated.snoozedUntil
        ? parseEpoch(validated.snoozedUntil)
        : null,
      isActive: validated.isActive,
      createdAt: parseEpoch(validated.createdAt),
      updatedAt: body.updatedAt ? parseEpoch(body.updatedAt) : Date.now(),
      deletedAt: null,
    };

    await db.insert(reminders).values(row).onConflictDoUpdate({
      target: reminders.id,
      set: row,
    });

    return NextResponse.json({ success: true, reminder: row }, { status: 201 });
  } catch (error) {
    console.error("Failed to upsert reminder into SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save reminder",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Reminder ID is required" },
        { status: 400 }
      );
    }

    const patchData: Record<string, unknown> = {
      updatedAt: updates.updatedAt ? parseEpoch(updates.updatedAt) : Date.now(),
    };

    if ("timing" in updates && updates.timing !== undefined) {
      patchData.timing =
        typeof updates.timing === "string"
          ? updates.timing
          : JSON.stringify(updates.timing);
    }
    if ("label" in updates) {
      patchData.label = updates.label || null;
    }
    if ("lastNotifiedOccurrenceDate" in updates) {
      patchData.lastNotifiedOccurrenceDate =
        updates.lastNotifiedOccurrenceDate || null;
    }
    if ("notifiedAt" in updates) {
      patchData.notifiedAt = updates.notifiedAt
        ? parseEpoch(updates.notifiedAt)
        : null;
    }
    if ("acknowledgedAt" in updates) {
      patchData.acknowledgedAt = updates.acknowledgedAt
        ? parseEpoch(updates.acknowledgedAt)
        : null;
    }
    if ("snoozedUntil" in updates) {
      patchData.snoozedUntil = updates.snoozedUntil
        ? parseEpoch(updates.snoozedUntil)
        : null;
    }
    if ("isActive" in updates && typeof updates.isActive === "boolean") {
      patchData.isActive = updates.isActive;
    }

    const [updated] = await db
      .update(reminders)
      .set(patchData)
      .where(eq(reminders.id, id))
      .returning();

    return NextResponse.json({ success: true, reminder: updated });
  } catch (error) {
    console.error("Failed to update reminder in SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update reminder",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const eventId = url.searchParams.get("eventId");
    if (!id && !eventId) {
      return NextResponse.json(
        { success: false, error: "Reminder ID or eventId is required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (id) {
      await db
        .update(reminders)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(reminders.id, id));
    } else if (eventId) {
      await db
        .update(reminders)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(reminders.eventId, eventId));
    }

    return NextResponse.json({ success: true, message: "Reminder soft-deleted" });
  } catch (error) {
    console.error("Failed to delete reminder from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
