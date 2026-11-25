import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { libraryCollections } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { LibraryCollectionSchema } from "@/lib/schemas/library-collection";

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
    const collections = await db
      .select()
      .from(libraryCollections)
      .orderBy(asc(libraryCollections.sortOrder));

    return NextResponse.json({ success: true, collections });
  } catch (error) {
    console.error("Failed to fetch library collections from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch library collections" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nowIso = new Date().toISOString();
    const id = body.id || crypto.randomUUID();

    const validated = LibraryCollectionSchema.parse({
      id,
      name: String(body.name || "").trim(),
      description: typeof body.description === "string" ? body.description : "",
      color: body.color || "#6366f1",
      icon: body.icon || "📁",
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
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
      name: validated.name,
      description: validated.description || "",
      color: validated.color,
      icon: validated.icon,
      isDefault: validated.isDefault,
      sortOrder: validated.sortOrder,
      createdAt: parseEpoch(validated.createdAt),
      updatedAt: parseEpoch(validated.updatedAt),
      deletedAt: null,
    };

    await db.insert(libraryCollections).values(row).onConflictDoUpdate({
      target: libraryCollections.id,
      set: row,
    });

    return NextResponse.json({ success: true, collection: row }, { status: 201 });
  } catch (error) {
    console.error("Failed to upsert library collection into SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save collection",
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
        { success: false, error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const patchData: Record<string, unknown> = {
      updatedAt: updates.updatedAt ? parseEpoch(updates.updatedAt) : Date.now(),
    };

    if ("name" in updates && typeof updates.name === "string") {
      patchData.name = updates.name.trim();
    }
    if ("description" in updates) {
      patchData.description = updates.description ? String(updates.description) : "";
    }
    if ("color" in updates && typeof updates.color === "string") {
      patchData.color = updates.color;
    }
    if ("icon" in updates && typeof updates.icon === "string") {
      patchData.icon = updates.icon;
    }
    if ("isDefault" in updates && typeof updates.isDefault === "boolean") {
      patchData.isDefault = updates.isDefault;
    }
    if ("sortOrder" in updates && typeof updates.sortOrder === "number") {
      patchData.sortOrder = updates.sortOrder;
    }

    const [updated] = await db
      .update(libraryCollections)
      .set(patchData)
      .where(eq(libraryCollections.id, id))
      .returning();

    return NextResponse.json({ success: true, collection: updated });
  } catch (error) {
    console.error("Failed to update library collection in SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update collection",
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
        { success: false, error: "Collection ID is required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    await db
      .update(libraryCollections)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(libraryCollections.id, id));

    return NextResponse.json({
      success: true,
      message: "Collection soft-deleted",
    });
  } catch (error) {
    console.error("Failed to delete library collection from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete library collection" },
      { status: 500 }
    );
  }
}
