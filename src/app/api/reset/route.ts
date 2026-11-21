import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inbox, tasks, habits, habitLogs } from "@/lib/db/schema";

export async function DELETE() {
  try {
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

export async function POST() {
  return DELETE();
}
