const fs = require("node:fs");
const path = require("node:path");

/**
 * electron-builder v26 strips `node_modules` inside `extraResources` by default.
 * This afterPack hook copies `electron-standalone/node_modules` into
 * `resources/standalone/node_modules` before NSIS packs the installer.
 */
exports.default = async function afterPack(context) {
  const projectDir = context.packager.projectDir;
  const srcNodeModules = path.join(projectDir, "electron-standalone", "node_modules");
  const destNodeModules = path.join(
    context.appOutDir,
    "resources",
    "standalone",
    "node_modules"
  );

  if (!fs.existsSync(srcNodeModules)) {
    throw new Error(`[afterPack] Missing staged node_modules at ${srcNodeModules}`);
  }

  fs.rmSync(destNodeModules, { recursive: true, force: true });
  fs.cpSync(srcNodeModules, destNodeModules, { recursive: true });

  const requiredFiles = [
    path.join(destNodeModules, "next", "package.json"),
    path.join(
      destNodeModules,
      "better-sqlite3",
      "build",
      "Release",
      "better_sqlite3.node"
    ),
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`[afterPack] Missing required unpacked file: ${file}`);
    }
  }

  console.log(
    `[afterPack] Copied standalone node_modules (next + better_sqlite3.node) -> ${destNodeModules}`
  );
};
