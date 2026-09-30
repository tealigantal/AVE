const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("projectApi", {
  query(request) { return ipcRenderer.invoke("project.query", request); },
  command(request) { return ipcRenderer.invoke("project.command", request); },
  subscribeProjectEvents(listener) { const wrapped = (_event, payload) => listener(payload); ipcRenderer.on("project.event", wrapped); return () => ipcRenderer.removeListener("project.event", wrapped); },
  chooseFiles(request) { return ipcRenderer.invoke("system.choose-files", request); },
  chooseDirectory() { return ipcRenderer.invoke("system.choose-directory"); },
  onBeforeClose(listener) { const wrapped = (_event, payload) => listener(payload); ipcRenderer.on("system.before-close", wrapped); return () => ipcRenderer.removeListener("system.before-close", wrapped); },
  acknowledgeClose(value) { return ipcRenderer.invoke("system.flush-complete", value); },
});
