import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { Project } from "../src/core/project.js" with {
  "resolution-mode": "import",
};
contextBridge.exposeInMainWorld("refract", {
  editText: (action: "undo" | "redo") =>
    ipcRenderer.invoke("edit-text", action),
  cropOpen: (data: unknown) => ipcRenderer.invoke("crop-open", data),
  cropState: () => ipcRenderer.invoke("crop-state"),
  cropFinish: (crop: unknown) => ipcRenderer.invoke("crop-finish", crop),
  generateCaptions: (project: Project, locale: string) =>
    ipcRenderer.invoke("captions-generate", project, locale),
  cancelCaptions: () => ipcRenderer.invoke("captions-cancel"),
  showRecorder: () => ipcRenderer.invoke("recorder-show"),
  recorderState: () => ipcRenderer.invoke("recorder-state"),
  recorderSources: () => ipcRenderer.invoke("recorder-sources"),
  recorderExpand: (expanded: boolean) =>
    ipcRenderer.invoke("recorder-expand", expanded),
  recorderStart: (choice: unknown) =>
    ipcRenderer.invoke("recorder-start", choice),
  recorderPause: () => ipcRenderer.invoke("recorder-pause"),
  recorderStop: () => ipcRenderer.invoke("recorder-stop"),
  recorderClose: () => ipcRenderer.invoke("recorder-close"),
  recorderImport: () => ipcRenderer.invoke("recorder-import"),
  recorderKeyboardPermissions: () =>
    ipcRenderer.invoke("recorder-keyboard-permissions"),
  recorderPermissions: () => ipcRenderer.invoke("recorder-permissions"),
  recorderArea: (id: number) => ipcRenderer.invoke("recorder-area", id),
  recorderAreaSelected: (area: unknown) =>
    ipcRenderer.invoke("recorder-area-selected", area),
  onRecorderState: (callback: (state: unknown) => void) => {
    const listener = (_: IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on("recorder-state", listener);
    return () => ipcRenderer.removeListener("recorder-state", listener);
  },
  onRecordingFinished: (callback: (data: unknown) => void) => {
    const listener = (_: IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on("recording-finished", listener);
    return () => ipcRenderer.removeListener("recording-finished", listener);
  },
  onAreaSelected: (callback: (data: unknown) => void) => {
    const listener = (_: IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on("recorder-area-result", listener);
    return () => ipcRenderer.removeListener("recorder-area-result", listener);
  },

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
