import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { habitLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const habitId = body.habitId ? String(body.habitId).trim() : "";
    const date = body.date ? String(body.date).trim() : "";

    if (!habitId || !date) {
      return NextResponse.json(
        { success: false, error: "habitId and date (YYYY-MM-DD) are required" },
        { status: 400 }
      );
    }

    // Check if log already exists for this habit on this date
    const existing = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
      .limit(1);

    if (existing.length > 0) {
      // Toggle off / remove completion log
      await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));
      return NextResponse.json({
        success: true,
        toggled: "removed",
        habitId,
        date,
        logId: existing[0].id,
      });
    } else {
      // Toggle on / create completion log
      const newLog = {
        id: body.id || crypto.randomUUID(),
        habitId,
        date,
        completed: body.completed !== undefined ? Boolean(body.completed) : true,
        createdAt: Date.now(),
      };

      await db.insert(habitLogs).values(newLog);
      return NextResponse.json(
        {
          success: true,
          toggled: "created",
          log: newLog,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Failed to toggle habit log in SQLite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to toggle habit log" },
      { status: 500 }
    );
  }
}
