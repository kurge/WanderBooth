const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wanderBooth", {
  printCurrentWindow: () => ipcRenderer.invoke("wanderbooth:print-current-window"),
  selectTetherFolder: () => ipcRenderer.invoke("wanderbooth:select-tether-folder"),
});
