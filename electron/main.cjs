const { app, BrowserWindow } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

let hostProcess;

function startProductionHost() {
  if (process.env.WANDERBOOTH_DEV_URL) return;

  hostProcess = spawn(process.execPath, [path.join(__dirname, "../dist-host/host/server.js")], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      WANDERBOOTH_DATA_DIR: path.join(app.getPath("userData"), "runtime"),
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
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  operatorWindow.webContents.setWindowOpenHandler(({ url }) => {
    const customerWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      fullscreenable: true,
      title: "WanderBooth Customer Display",
      backgroundColor: "#fff23c",
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
      },
    });
    customerWindow.loadURL(url);
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

app.whenReady().then(() => {
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
