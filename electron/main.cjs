const { app, BrowserWindow, ipcMain, session } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

let hostProcess;

const sharedWebPreferences = () => ({
  contextIsolation: true,
  preload: path.join(__dirname, "preload.cjs"),
  sandbox: true,
});

function startProductionHost() {
  if (process.env.WANDERBOOTH_DEV_URL) return;

  hostProcess = spawn(process.execPath, [path.join(__dirname, "../dist-host/host/server.js")], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      WANDERBOOTH_DATA_DIR: path.join(app.getPath("userData"), "runtime"),
      WANDERBOOTH_WEB_DIR: path.join(__dirname, "../dist"),
    },
    stdio: "inherit",
  });
}

function createOperatorWindow() {
  const operatorWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    title: "WanderBooth Operator",
    backgroundColor: "#f7f4ed",
    webPreferences: sharedWebPreferences(),
  });

  operatorWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isTrustedBoothUrl(url)) return { action: "deny" };
    const parsed = new URL(url);
    const isPrintPreview = parsed.searchParams.get("surface") === "print";
    const childWindow = new BrowserWindow(
      isPrintPreview
        ? {
            width: 980,
            height: 920,
            minWidth: 760,
            minHeight: 700,
            title: "WanderBooth Print Preview",
            backgroundColor: "#f7f4ed",
            webPreferences: sharedWebPreferences(),
          }
        : {
            width: 1024,
            height: 768,
            fullscreenable: true,
            title: "WanderBooth Customer Display",
            backgroundColor: "#fff23c",
            webPreferences: sharedWebPreferences(),
          },
    );
    childWindow.loadURL(url);
    return { action: "deny" };
  });

  const devUrl = process.env.WANDERBOOTH_DEV_URL;
  if (devUrl) {
    operatorWindow.loadURL(`${devUrl}/?surface=operator`);
  } else {
    operatorWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      query: { surface: "operator" },
    });
  }
}

function isTrustedBoothUrl(url) {
  if (url.startsWith("file://")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(parsed.hostname) &&
      ["4174", "5173"].includes(parsed.port)
    );
  } catch {
    return false;
  }
}

function isPrintSurfaceUrl(url) {
  if (!isTrustedBoothUrl(url)) return false;
  try {
    return new URL(url).searchParams.get("surface") === "print";
  } catch {
    return false;
  }
}

function configureCameraPermissions() {
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin) =>
      permission === "media" && isTrustedBoothUrl(requestingOrigin),
  );
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const trusted = isTrustedBoothUrl(details.requestingUrl || webContents.getURL());
      const requestsAudio = details.mediaTypes?.includes("audio") ?? false;
      callback(permission === "media" && trusted && !requestsAudio);
    },
  );
}

app.whenReady().then(() => {
  ipcMain.handle(
    "wanderbooth:print-current-window",
    (event) =>
      new Promise((resolvePrint) => {
        if (!isPrintSurfaceUrl(event.sender.getURL())) {
          resolvePrint({ success: false, failureReason: "Printing is limited to print preview." });
          return;
        }
        event.sender.print(
          {
            printBackground: true,
            silent: false,
          },
          (success, failureReason) => {
            resolvePrint({ success, failureReason: failureReason || null });
          },
        );
      }),
  );
  configureCameraPermissions();
  startProductionHost();
  createOperatorWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createOperatorWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (hostProcess) hostProcess.kill();
});
