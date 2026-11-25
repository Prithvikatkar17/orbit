import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { libraryFiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { MAX_LIBRARY_FILE_SIZE } from "@/lib/schemas/library-file";

function parseEpoch(val: unknown, fallback: number = Date.now()): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "File ID (?id=...) is required" },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(libraryFiles)
      .where(eq(libraryFiles.id, id));
    const file = rows[0];

    if (!file || file.deletedAt != null) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, file });
  } catch (error) {
    console.error("Failed to fetch library file from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch library file" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = body.id || crypto.randomUUID();
    const entryId = body.entryId;
    const fileName = String(body.fileName || "").trim();
    const mimeType = String(body.mimeType || body.fileType || "application/octet-stream");
    const sizeBytes = Number(body.sizeBytes ?? body.fileSize ?? 0);
    const dataBase64 = String(body.dataBase64 || "");

    if (!entryId || !fileName || !dataBase64) {
      return NextResponse.json(
        {
          success: false,
          error: "entryId, fileName, and dataBase64 are required",
        },
        { status: 400 }
      );
    }

    if (sizeBytes < 0 || sizeBytes > MAX_LIBRARY_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 20 MB limit" },
        { status: 400 }
      );
    }

    const row = {
      id,
      entryId,
      fileName,
      mimeType,
      sizeBytes,
      dataBase64,
      createdAt: parseEpoch(body.createdAt),
      deletedAt: null,
    };

    await db.insert(libraryFiles).values(row).onConflictDoUpdate({
      target: libraryFiles.id,
      set: row,
    });

    return NextResponse.json(
      {
        success: true,
        file: {
          id: row.id,
          entryId: row.entryId,
          fileName: row.fileName,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          createdAt: row.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload library file to SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save file",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const entryId = url.searchParams.get("entryId");
    if (!id && !entryId) {
      return NextResponse.json(
        { success: false, error: "File ID or entryId is required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (id) {
      await db
        .update(libraryFiles)
        .set({ deletedAt: now })
        .where(eq(libraryFiles.id, id));
    } else if (entryId) {
      await db
        .update(libraryFiles)
        .set({ deletedAt: now })
        .where(eq(libraryFiles.entryId, entryId));
    }

    return NextResponse.json({
      success: true,
      message: "Library file soft-deleted",
    });
  } catch (error) {
    console.error("Failed to delete library file from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete library file" },
      { status: 500 }
    );
  }
}
