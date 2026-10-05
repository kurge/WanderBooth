const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wanderBooth", {
  printCurrentWindow: () => ipcRenderer.invoke("wanderbooth:print-current-window"),
});
