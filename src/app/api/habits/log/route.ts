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

    // Explicit completion intent: boolean true or false
    if (body.completed !== undefined) {
      const isCompleted = Boolean(body.completed);
      if (isCompleted) {
        const newLog = {
          id: body.id || crypto.randomUUID(),
          habitId,
          date,
          completed: true,
          createdAt: typeof body.createdAt === "number" ? body.createdAt : Date.now(),
        };

        await db
          .insert(habitLogs)
          .values(newLog)
          .onConflictDoUpdate({
            target: [habitLogs.habitId, habitLogs.date],
            set: { completed: true },
          });

        return NextResponse.json(
          {
            success: true,
            toggled: "created",
            log: newLog,
          },
          { status: 200 }
        );
      } else {
        await db
          .delete(habitLogs)
          .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));

        return NextResponse.json({
          success: true,
          toggled: "removed",
          habitId,
          date,
        });
      }
    }

    // Fallback: Toggle behavior when completed flag is omitted
    const existing = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(habitLogs).where(eq(habitLogs.id, existing[0].id));
      return NextResponse.json({
        success: true,
        toggled: "removed",
        habitId,
        date,
        logId: existing[0].id,
      });
    } else {
      const newLog = {
        id: body.id || crypto.randomUUID(),
        habitId,
        date,
        completed: true,
        createdAt: Date.now(),
      };

      await db
        .insert(habitLogs)
        .values(newLog)
        .onConflictDoUpdate({
          target: [habitLogs.habitId, habitLogs.date],
          set: { completed: true },
        });

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
    console.error("Failed to update habit log in SQLite:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update habit log" },
      { status: 500 }
    );
  }
}
