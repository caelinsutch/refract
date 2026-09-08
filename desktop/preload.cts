import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { Project } from "../src/core/project.js" with {
  "resolution-mode": "import",
};
contextBridge.exposeInMainWorld("refract", {
  importVideo: () => ipcRenderer.invoke("import-video"),
  openProject: () => ipcRenderer.invoke("open-project"),
  saveProject: (project: Project, saveAs?: boolean) =>
    ipcRenderer.invoke("save-project", project, saveAs),
  exportStart: (options: {
    project: Project;
    width: number;
    height: number;
    fps: number;
    format: string;
  }) => ipcRenderer.invoke("export-start", options),
  exportFrame: (id: string, data: ArrayBuffer) =>
    ipcRenderer.invoke("export-frame", id, data),
  exportFinish: (id: string) => ipcRenderer.invoke("export-finish", id),
  exportCancel: () => ipcRenderer.invoke("export-cancel"),
  onMenu: (callback: (action: string) => void) => {
    const listener = (_: IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on("menu-action", listener);
    return () => ipcRenderer.removeListener("menu-action", listener);
  },
});
