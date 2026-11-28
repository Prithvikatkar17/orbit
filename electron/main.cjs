const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");
const { fork } = require("node:child_process");

app.setName("ORBIT");

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

function tryBindPort(port) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(port, "127.0.0.1", () => {
      const address = srv.address();
      const boundPort =
        typeof address === "object" && address ? address.port : port;
      srv.close(() => resolve(boundPort));
    });
  });
}

async function getPreferredPort(startPort = 47831, endPort = 47850) {
  for (let port = startPort; port <= endPort; port++) {
    try {
      return await tryBindPort(port);
    } catch {
      // Port busy; try next sequential port
    }
  }
  return tryBindPort(0);
}

function waitForServerReady(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server responded with status ${res.statusCode}`));
        } else {
          setTimeout(attempt, 150);
        }
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Timed out waiting for local ORBIT server"));
        } else {
          setTimeout(attempt, 150);
        }
      });
      req.setTimeout(1500, () => req.destroy());
    };
    attempt();
  });
}

function resolveStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  }
  const staged = path.join(__dirname, "..", "electron-standalone");
  if (fs.existsSync(path.join(staged, "server.js"))) {
    return staged;
  }
  return path.join(__dirname, "..", ".next", "standalone");
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill("SIGTERM");
    } catch {}
    serverProcess = null;
  }
}

async function createMainWindow() {
  const userDataDir = app.getPath("userData");
  fs.mkdirSync(userDataDir, { recursive: true });

  const dbPath = path.join(userDataDir, "orbit.sqlite");
  process.env.ORBIT_DB_PATH = dbPath;

  const port = await getPreferredPort(47831, 47850);
  const standaloneDir = resolveStandaloneDir();
  const serverJs = path.join(standaloneDir, "server.js");

  if (!fs.existsSync(serverJs)) {
    throw new Error(`ORBIT standalone server not found at: ${serverJs}`);
  }

  let stderrBuffer = "";
  let earlyExitError = null;

  serverProcess = fork(serverJs, [], {
    cwd: standaloneDir,
    stdio: "pipe",
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      ORBIT_DB_PATH: dbPath,
    },
  });

  serverProcess.stderr?.on("data", (chunk) => {
    const text = chunk.toString();
    stderrBuffer += text;
    console.error("[ORBIT Server]", text);
  });

  serverProcess.on("exit", (code, signal) => {
    if (!isQuitting && !mainWindow) {
      earlyExitError = new Error(
        `ORBIT server exited early (code=${code}, signal=${signal}).\n\n${stderrBuffer.trim()}`
      );
    }
  });

  const serverUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServerReady(serverUrl);
  } catch (err) {
    if (earlyExitError) throw earlyExitError;
    const detail = stderrBuffer.trim()
      ? `${err instanceof Error ? err.message : String(err)}\n\n${stderrBuffer.trim()}`
      : err instanceof Error
      ? err.message
      : String(err);
    throw new Error(detail);
  }

  const iconPath = path.join(
    standaloneDir,
    "public",
    "icons",
    "icon-512x512.png"
  );

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    title: "ORBIT",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Open external http/https links in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(serverUrl)) {
      void shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (/^https?:\/\//i.test(url) && !url.startsWith(serverUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(serverUrl);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await createMainWindow();
    } catch (err) {
      console.error("Failed to launch ORBIT desktop:", err);
      dialog.showErrorBox(
        "ORBIT Startup Error",
        err instanceof Error ? err.message : String(err)
      );
      stopServer();
      app.quit();
    }
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  stopServer();
});

app.on("window-all-closed", () => {
  if (!isQuitting) {
    stopServer();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
