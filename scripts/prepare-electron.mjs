import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const standaloneSrc = path.join(ROOT, ".next", "standalone");
const staticSrc = path.join(ROOT, ".next", "static");
const publicSrc = path.join(ROOT, "public");
const destDir = path.join(ROOT, "electron-standalone");

if (!fs.existsSync(path.join(standaloneSrc, "server.js"))) {
  throw new Error(
    "Missing .next/standalone/server.js. Run `npm run build` first."
  );
}

fs.rmSync(destDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
fs.cpSync(standaloneSrc, destDir, { recursive: true });

if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, path.join(destDir, ".next", "static"), {
    recursive: true,
  });
}

if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(destDir, "public"), { recursive: true });
}

// Privacy Guard: strip any local SQLite databases, env files, or static export dirs
const FORBIDDEN_PATTERNS = [
  /\.sqlite(-wal|-shm|-journal)?$/i,
  /\.db(-wal|-shm|-journal)?$/i,
  /^\.env/i,
];

function scrubSensitiveFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "out" || entry.name === "dist-electron") {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        scrubSensitiveFiles(fullPath);
      }
    } else if (FORBIDDEN_PATTERNS.some((re) => re.test(entry.name))) {
      fs.rmSync(fullPath, { force: true });
      console.log(`[prepare-electron] Scrubbed sensitive file: ${entry.name}`);
    }
  }
}

scrubSensitiveFiles(destDir);

const REQUIRED_PATHS = [
  path.join(destDir, "server.js"),
  path.join(destDir, "node_modules", "next", "package.json"),
  path.join(destDir, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node"),
];

for (const reqPath of REQUIRED_PATHS) {
  if (!fs.existsSync(reqPath)) {
    throw new Error(`[prepare-electron] Missing required staged file: ${reqPath}`);
  }
}

console.log("[prepare-electron] Verified server.js, next, and better_sqlite3.node in electron-standalone/");
