const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("projectApi", {
  query(request) { return ipcRenderer.invoke("project.query", request); },
  command(request) { return ipcRenderer.invoke("project.command", request); },
});
