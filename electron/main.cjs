const { app, BrowserWindow } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

let serverProcess;

function startLocalServer() {
  const serverPath = path.join(__dirname, "..", "electron", "serve.mjs");
  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: "47821",
      NITRO_PORT: "47821",
      HOST: "127.0.0.1",
      NITRO_HOST: "127.0.0.1",
    },
    stdio: "ignore",
    windowsHide: true,
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 980,
    minHeight: 700,
    backgroundColor: "#1e3a5f",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  const url = "http://127.0.0.1:47821/";
  const load = () => window.loadURL(url);
  const retry = setInterval(() => {
    if (window.isDestroyed()) {
      clearInterval(retry);
      return;
    }
    load()
      .then(() => {
        clearInterval(retry);
        window.show();
      })
      .catch(() => undefined);
  }, 250);

  window.once("closed", () => clearInterval(retry));
}

app.whenReady().then(() => {
  startLocalServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
