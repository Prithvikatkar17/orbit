import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inbox } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const items = await db.select().from(inbox).orderBy(desc(inbox.createdAt));
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Failed to fetch inbox items from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inbox items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = body.id || crypto.randomUUID();
    const title = (body.title || "").trim();

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const notes = body.notes ? String(body.notes).trim() : "";
    const link = body.link ? String(body.link).trim() : null;
    const category = body.category ? String(body.category).trim() : "inbox";
    const status = body.status ? String(body.status).trim() : "pending";
    const createdAt =
      typeof body.createdAt === "number"
        ? body.createdAt
        : typeof body.createdAt === "string"
        ? Date.parse(body.createdAt) || Date.now()
        : Date.now();

    const newItem = {
      id,
      title,
      notes,
      link,
      category,
      status,
      createdAt,
    };

    await db.insert(inbox).values(newItem);

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    console.error("Failed to insert inbox item into SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create inbox item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Inbox ID is required" }, { status: 400 });
    }

    const itemUpdates: Record<string, unknown> = {};
    if ("title" in updates && typeof updates.title === "string") itemUpdates.title = updates.title.trim();
    if ("notes" in updates) itemUpdates.notes = updates.notes ? String(updates.notes).trim() : null;
    if ("link" in updates) itemUpdates.link = updates.link ? String(updates.link).trim() : null;
    if ("category" in updates) itemUpdates.category = String(updates.category).trim().toLowerCase();
    if ("status" in updates) itemUpdates.status = String(updates.status).trim();

    await db.update(inbox).set(itemUpdates).where(eq(inbox.id, id));
    return NextResponse.json({ success: true, updated: { id, ...itemUpdates } });
  } catch (error) {
    console.error("Failed to update inbox item in SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update inbox item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }
    await db.delete(inbox).where(eq(inbox.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete inbox item from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete inbox item" },
      { status: 500 }
    );
  }
}
