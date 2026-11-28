import { NextResponse, type NextRequest } from "next/server";
import { sqlite, getDbPath } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Metadata query: ?meta=1
  if (searchParams.get("meta") === "1") {
    try {
      const dbPath = path.resolve(getDbPath());
      let sizeBytes = 0;
      let lastModified: string | null = null;

      if (fs.existsSync(dbPath)) {
        const stats = await fs.promises.stat(dbPath);
        sizeBytes = stats.size;
        lastModified = stats.mtime.toISOString();
      }

      return NextResponse.json({
        success: true,
        sizeBytes,
        lastModified,
        wal: true,
      });
    } catch (err) {
      console.error("Failed to read SQLite database metadata:", err);
      return NextResponse.json(
        { success: false, error: "Failed to read database metadata" },
        { status: 500 }
      );
    }
  }

  // Backup snapshot download: create atomic, WAL-safe single-file backup
  const tempPath = path.join(
    os.tmpdir(),
    `orbit-backup-${Date.now()}-${crypto.randomUUID()}.sqlite`
  );

  try {
    // WAL-safe atomic online backup via better-sqlite3
    await sqlite.backup(tempPath);

    const fileBuffer = await fs.promises.readFile(tempPath);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `orbit-backup-${dateStr}.sqlite`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Failed to generate SQLite database snapshot:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate database snapshot" },
      { status: 500 }
    );
  } finally {
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch (cleanupErr) {
      console.warn("Failed to cleanup temp backup file:", cleanupErr);
    }
  }
}

export async function HEAD() {
  try {
    const dbPath = path.resolve("orbit.sqlite");
    let sizeBytes = 0;
    if (fs.existsSync(dbPath)) {
      const stats = await fs.promises.stat(dbPath);
      sizeBytes = stats.size;
    }
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Length": sizeBytes.toString(),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
