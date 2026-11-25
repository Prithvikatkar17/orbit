import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const apiDir = path.join(ROOT, "src", "app", "api");
const backupDir = path.join(ROOT, ".orbit-static-api-backup");
const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

let movedApi = false;

function moveDirSync(src, dest) {
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err && (err.code === "EPERM" || err.code === "EBUSY" || err.code === "EXDEV")) {
      fs.cpSync(src, dest, { recursive: true });
      fs.rmSync(src, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } else {
      throw err;
    }
  }
}

function restoreApiDir() {
  if (movedApi && fs.existsSync(backupDir) && !fs.existsSync(apiDir)) {
    moveDirSync(backupDir, apiDir);
    movedApi = false;
    console.log("[build:static] Restored src/app/api");
  }
}

process.on("SIGINT", () => {
  restoreApiDir();
  process.exit(130);
});

process.on("SIGTERM", () => {
  restoreApiDir();
  process.exit(143);
});

let exitCode = 1;

try {
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(backupDir)) {
      throw new Error(
        `Backup directory already exists at ${backupDir}. Please inspect and remove it first.`
      );
    }
    moveDirSync(apiDir, backupDir);
    movedApi = true;
    console.log("[build:static] Temporarily moved src/app/api -> .orbit-static-api-backup");
  }

  console.log("[build:static] Building static PWA export into ./out ...");
  const result = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      ORBIT_STATIC_EXPORT: "1",
      NEXT_PUBLIC_STATIC_MODE: "true",
    },
  });

  exitCode = result.status ?? 1;
} finally {
  restoreApiDir();
}

process.exit(exitCode);
