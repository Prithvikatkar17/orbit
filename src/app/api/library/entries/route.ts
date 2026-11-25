import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { libraryEntries } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { LibraryEntrySchema } from "@/lib/schemas/library-entry";

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
    const entries = await db
      .select()
      .from(libraryEntries)
      .orderBy(desc(libraryEntries.createdAt));

    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error("Failed to fetch library entries from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch library entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();
    const id = body.id || crypto.randomUUID();

    const parsedTags =
      typeof body.tags === "string"
        ? JSON.parse(body.tags)
        : Array.isArray(body.tags)
        ? body.tags
        : [];

    const parsedFileMeta =
      typeof body.fileMetadata === "string"
        ? JSON.parse(body.fileMetadata)
        : body.fileMetadata || undefined;

    const validated = LibraryEntrySchema.parse({
      id,
      title: String(body.title || "").trim(),
      notes: typeof body.notes === "string" ? body.notes : "",
      link: body.link ? String(body.link).trim() : undefined,
      type: body.type || "other",
      status: body.status || "saved",
      rating: typeof body.rating === "number" ? body.rating : undefined,
      tags: parsedTags,
      isFavorite: typeof body.isFavorite === "boolean" ? body.isFavorite : false,
      collectionId: body.collectionId || undefined,
      lastViewedAt:
        typeof body.lastViewedAt === "number"
          ? new Date(body.lastViewedAt).toISOString()
          : body.lastViewedAt || undefined,
      completedAt:
        typeof body.completedAt === "number"
          ? new Date(body.completedAt).toISOString()
          : body.completedAt || undefined,
      sourceItemId: body.sourceItemId || undefined,
      fileMetadata: parsedFileMeta,
      createdAt:
        typeof body.createdAt === "number"
          ? new Date(body.createdAt).toISOString()
          : body.createdAt || nowIso,
      updatedAt:
        typeof body.updatedAt === "number"
          ? new Date(body.updatedAt).toISOString()
          : body.updatedAt || nowIso,
    });

    const row = {
      id: validated.id,
      title: validated.title,
      notes: validated.notes || "",
      link: validated.link || null,
      type: validated.type,
      status: validated.status,
      rating: validated.rating ?? null,
      tags: JSON.stringify(validated.tags),
      isFavorite: validated.isFavorite,
      collectionId: validated.collectionId || null,
      lastViewedAt: validated.lastViewedAt
        ? parseEpoch(validated.lastViewedAt)
        : null,
      completedAt: validated.completedAt
        ? parseEpoch(validated.completedAt)
        : null,
      sourceItemId: validated.sourceItemId || null,
      fileMetadata: validated.fileMetadata
        ? JSON.stringify(validated.fileMetadata)
        : null,
      createdAt: parseEpoch(validated.createdAt),
      updatedAt: parseEpoch(validated.updatedAt),
      deletedAt: null,
    };

    await db.insert(libraryEntries).values(row).onConflictDoUpdate({
      target: libraryEntries.id,
      set: row,
    });

    return NextResponse.json({ success: true, entry: row }, { status: 201 });
  } catch (error) {
    console.error("Failed to upsert library entry into SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save library entry",
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
        { success: false, error: "Entry ID is required" },
        { status: 400 }
      );
    }

    const patchData: Record<string, unknown> = {
      updatedAt: updates.updatedAt ? parseEpoch(updates.updatedAt) : Date.now(),
    };

    if ("title" in updates && typeof updates.title === "string") {
      patchData.title = updates.title.trim();
    }
    if ("notes" in updates) {
      patchData.notes = updates.notes ? String(updates.notes) : "";
    }
    if ("link" in updates) {
      patchData.link = updates.link ? String(updates.link).trim() : null;
    }
    if ("type" in updates && typeof updates.type === "string") {
      patchData.type = updates.type;
    }
    if ("status" in updates && typeof updates.status === "string") {
      patchData.status = updates.status;
    }
    if ("rating" in updates) {
      patchData.rating = typeof updates.rating === "number" ? updates.rating : null;
    }
    if ("tags" in updates && updates.tags !== undefined) {
      patchData.tags =
        typeof updates.tags === "string"
          ? updates.tags
          : JSON.stringify(updates.tags);
    }
    if ("isFavorite" in updates && typeof updates.isFavorite === "boolean") {
      patchData.isFavorite = updates.isFavorite;
    }
    if ("collectionId" in updates) {
      patchData.collectionId = updates.collectionId || null;
    }
    if ("lastViewedAt" in updates) {
      patchData.lastViewedAt = updates.lastViewedAt
        ? parseEpoch(updates.lastViewedAt)
        : null;
    }
    if ("completedAt" in updates) {
      patchData.completedAt = updates.completedAt
        ? parseEpoch(updates.completedAt)
        : null;
    }
    if ("fileMetadata" in updates) {
      patchData.fileMetadata = updates.fileMetadata
        ? typeof updates.fileMetadata === "string"
          ? updates.fileMetadata
          : JSON.stringify(updates.fileMetadata)
        : null;
    }

    const [updated] = await db
      .update(libraryEntries)
      .set(patchData)
      .where(eq(libraryEntries.id, id))
      .returning();

    return NextResponse.json({ success: true, entry: updated });
  } catch (error) {
    console.error("Failed to update library entry in SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update library entry",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Entry ID is required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    await db
      .update(libraryEntries)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(libraryEntries.id, id));

    return NextResponse.json({
      success: true,
      message: "Library entry soft-deleted",
    });
  } catch (error) {
    console.error("Failed to delete library entry from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete library entry" },
      { status: 500 }
    );
  }
}
