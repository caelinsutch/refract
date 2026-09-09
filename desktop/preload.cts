import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { Project } from "../src/core/project.js" with {
  "resolution-mode": "import",
};
contextBridge.exposeInMainWorld("refract", {
  onProjectGuard: (callback: (id: string) => void) => {
    const listener = (_: IpcRendererEvent, id: string) => callback(id);
    ipcRenderer.on("project-guard-request", listener);
    return () => ipcRenderer.removeListener("project-guard-request", listener);
  },
  projectGuardResult: (id: string, allowed: boolean) =>
    ipcRenderer.invoke("project-guard-result", id, allowed),
  editText: (action: "undo" | "redo") =>
    ipcRenderer.invoke("edit-text", action),
  cropOpen: (data: unknown) => ipcRenderer.invoke("crop-open", data),
  cropState: () => ipcRenderer.invoke("crop-state"),
  cropFinish: (crop: unknown) => ipcRenderer.invoke("crop-finish", crop),
  generateCaptions: (project: Project, locale: string) =>
    ipcRenderer.invoke("captions-generate", project, locale),
  cancelCaptions: () => ipcRenderer.invoke("captions-cancel"),
  recorderWindowPicker: () => ipcRenderer.invoke("recorder-window-picker"),
  recorderWindowPickerCancel: () =>
    ipcRenderer.invoke("recorder-window-picker-cancel"),
  windowPickerIcon: (id: number) =>
    ipcRenderer.invoke("window-picker-icon", id),
  windowPickerState: () => ipcRenderer.invoke("window-picker-state"),
  windowPickerSelect: (id: number | null) =>
    ipcRenderer.invoke("window-picker-select", id),
  windowPickerFinish: (action: string) =>
    ipcRenderer.invoke("window-picker-finish", action),
  onWindowPickerState: (callback: (value: unknown) => void) => {
    const listener = (_event: unknown, value: unknown) => callback(value);
    ipcRenderer.on("window-picker-state", listener);
    return () => ipcRenderer.removeListener("window-picker-state", listener);
  },
  showRecorder: () => ipcRenderer.invoke("recorder-show"),
  windowPickerOptions: (request: unknown) =>
    ipcRenderer.invoke("window-picker-options", request),
  displayPickerOptions: (request: unknown) =>
    ipcRenderer.invoke("display-picker-options", request),
  countdownCancel: () => ipcRenderer.invoke("countdown-cancel"),
  onCountdownTick: (callback: (seconds: number) => void) => {
    const listener = (_event: unknown, seconds: number) => callback(seconds);
    ipcRenderer.on("countdown-tick", listener);
    return () => ipcRenderer.removeListener("countdown-tick", listener);
  },
  recorderPanelGlass: (rect: unknown) =>
    ipcRenderer.invoke("recorder-panel-glass", rect),
  recorderState: () => ipcRenderer.invoke("recorder-state"),
  recorderDirectory: () => ipcRenderer.invoke("recorder-directory"),
  recorderChooseDirectory: () =>
    ipcRenderer.invoke("recorder-directory-choose"),
  recorderSymbols: () => ipcRenderer.invoke("recorder-symbols"),
  recorderSources: () => ipcRenderer.invoke("recorder-sources"),
  recorderDisplayPicker: (id?: number) =>
    ipcRenderer.invoke("recorder-display-picker", id),
  recorderDisplayPickerCancel: () =>
    ipcRenderer.invoke("recorder-display-picker-cancel"),
  displayPickerFinish: (accepted: boolean) =>
    ipcRenderer.invoke("display-picker-finish", accepted),
  recorderSourceMenu: (request: unknown) =>
    ipcRenderer.invoke("recorder-source-menu", request),
  recorderInputMenu: (request: unknown) =>
    ipcRenderer.invoke("recorder-input-menu", request),
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
  audioLibraryList: () => ipcRenderer.invoke("audio-library-list"),
  audioLibraryOpen: () => ipcRenderer.invoke("audio-library-open"),
  audioLibraryImport: (name: string) =>
    ipcRenderer.invoke("audio-library-import", name),
  importBackgroundAudio: () => ipcRenderer.invoke("import-background-audio"),
  projectAudioUrl: (file: string) =>
    ipcRenderer.invoke("project-audio-url", file),
  confirmUnsaved: (title: string) =>
    ipcRenderer.invoke("confirm-unsaved", title),
  openProject: () => ipcRenderer.invoke("open-project"),
  saveProject: (project: Project, saveAs?: boolean) =>
    ipcRenderer.invoke("save-project", project, saveAs),
  showClipboardExports: () => ipcRenderer.invoke("show-clipboard-exports"),
  exportStart: (options: {
    project: Project;
    width: number;
    height: number;
    fps: number;
    destination?: "file" | "clipboard";
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
