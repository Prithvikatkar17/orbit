import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SettingsSchema } from "@/lib/schemas/settings";

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
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.id, "user_settings"));
    const row = rows[0];

    if (!row) {
      return NextResponse.json({ success: true, settings: null });
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(row.payloadJson);
    } catch {
      parsed = null;
    }

    return NextResponse.json({
      success: true,
      settings: parsed,
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    console.error("Failed to fetch settings from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

async function upsertSettings(request: Request) {
  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();

    const validated = SettingsSchema.parse({
      ...body,
      id: "user_settings",
      updatedAt:
        typeof body.updatedAt === "number"
          ? new Date(body.updatedAt).toISOString()
          : body.updatedAt || nowIso,
    });

    const incomingUpdatedAt = parseEpoch(validated.updatedAt);

    // LWW guard: do not overwrite newer settings in SQLite
    const existingRows = await db
      .select()
      .from(settings)
      .where(eq(settings.id, "user_settings"));
    const existing = existingRows[0];

    if (existing && existing.updatedAt > incomingUpdatedAt) {
      let parsedExisting = null;
      try {
        parsedExisting = JSON.parse(existing.payloadJson);
      } catch {
        parsedExisting = null;
      }
      return NextResponse.json({
        success: true,
        settings: parsedExisting,
        skippedStaleWrite: true,
      });
    }

    const row = {
      id: "user_settings",
      payloadJson: JSON.stringify(validated),
      updatedAt: incomingUpdatedAt,
    };

    await db.insert(settings).values(row).onConflictDoUpdate({
      target: settings.id,
      set: row,
    });

    return NextResponse.json({ success: true, settings: validated });
  } catch (error) {
    console.error("Failed to upsert settings into SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  return upsertSettings(request);
}

export async function PATCH(request: Request) {
  return upsertSettings(request);
}
