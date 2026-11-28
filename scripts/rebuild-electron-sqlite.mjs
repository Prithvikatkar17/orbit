import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const sqliteDir = path.join(ROOT, "electron-standalone", "node_modules", "better-sqlite3");
const electronPkgPath = path.join(ROOT, "node_modules", "electron", "package.json");

if (!fs.existsSync(sqliteDir)) {
  throw new Error(`Missing ${sqliteDir}. Run scripts/prepare-electron.mjs first.`);
}

const electronVersion = JSON.parse(fs.readFileSync(electronPkgPath, "utf-8")).version;
console.log(`[electron:rebuild] Targeting Electron v${electronVersion} in ${sqliteDir}`);

const prebuildBin = path.join(ROOT, "node_modules", "prebuild-install", "bin.js");
const prebuildRes = spawnSync(
  process.execPath,
  [prebuildBin, "-r", "electron", "-t", electronVersion, "--force"],
  { cwd: sqliteDir, stdio: "inherit" }
);

if (prebuildRes.status === 0) {
  console.log("[electron:rebuild] Installed prebuilt better_sqlite3.node for Electron cleanly.");
  process.exit(0);
}

console.warn("[electron:rebuild] Prebuild unavailable; falling back to @electron/rebuild...");
const rebuildBin = path.join(ROOT, "node_modules", "@electron", "rebuild", "lib", "cli.js");
const rebuildRes = spawnSync(
  process.execPath,
  [rebuildBin, "-f", "-w", "better-sqlite3", "-m", path.join(ROOT, "electron-standalone"), "-v", electronVersion],
  { cwd: ROOT, stdio: "inherit" }
);

process.exit(rebuildRes.status ?? 1);
