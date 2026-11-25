import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  inbox,
  tasks,
  habits,
  habitLogs,
  expenses,
  calendarEvents,
  reminders,
  libraryCollections,
  libraryEntries,
  libraryFiles,
  settings,
} from "@/lib/db/schema";

function isCsrfValid(request: Request): boolean {
  const confirmHeader = request.headers.get("X-Orbit-Confirm");
  if (confirmHeader !== "reset") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
    try {
      const originUrl = new URL(origin);
      if (host && originUrl.host !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export async function DELETE(request: Request) {
  try {
    if (!isCsrfValid(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized reset request: missing or invalid CSRF headers" },
        { status: 403 }
      );
    }

    await db.delete(libraryFiles);
    await db.delete(libraryEntries);
    await db.delete(libraryCollections);
    await db.delete(reminders);
    await db.delete(calendarEvents);
    await db.delete(settings);
    await db.delete(expenses);
    await db.delete(habitLogs);
    await db.delete(habits);
    await db.delete(tasks);
    await db.delete(inbox);

    return NextResponse.json({
      success: true,
      message: "SQLite tables cleared successfully",
    });
  } catch (error) {
    console.error("Failed to reset SQLite database:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset SQLite database" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return DELETE(request);
}
