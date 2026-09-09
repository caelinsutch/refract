import { BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import type {
  CaptureSources,
  WindowPickerState,
  WindowPickerResult,
} from "../src/core/recorder.js" with { "resolution-mode": "import" };
export function createWindowPicker(list: () => Promise<CaptureSources>) {
  const windows = new Map<BrowserWindow, Electron.Display>();
  let generation = 0,
    sources: CaptureSources["windows"] = [],
    selected: number | null = null;
  let finish: ((result: WindowPickerResult) => void) | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  function cancel(result: WindowPickerResult = null) {
    generation++;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = undefined;
    const complete = finish;
    finish = undefined;
    const live = [...windows.keys()].filter((window) => !window.isDestroyed());
    windows.clear();
    let remaining = live.length;
    if (!remaining) complete?.(result);
    for (const window of live) {
      window.once("closed", () => {
        if (--remaining === 0) complete?.(result);
      });
      window.close();
    }
  }
  function state(owner: BrowserWindow): WindowPickerState {
    return { bounds: windows.get(owner)!.bounds, windows: sources, selected };
  }
  function broadcast() {
    for (const window of windows.keys())
      if (!window.isDestroyed())
        window.webContents.send("window-picker-state", state(window));
  }
  function owner(sender: Electron.WebContents) {
    const window = [...windows.keys()].find(
      (item) => item.webContents === sender,
    );
    if (!window) throw Error("Unknown window picker sender.");
    return window;
  }
  ipcMain.handle("window-picker-state", (event) => state(owner(event.sender)));
  ipcMain.handle("window-picker-select", (event, id: number | null) => {
    owner(event.sender);
    selected = sources.some((source) => source.id === id) ? id : null;
    broadcast();
  });
  ipcMain.handle("window-picker-finish", (event, action: string) => {
    const window = owner(event.sender);
    if (action === "display") cancel({ displayId: windows.get(window)!.id });
    else if (
      action === "record" &&
      selected !== null &&
      sources.some((source) => source.id === selected)
    )
      cancel({ windowId: selected });
    else if (action === "cancel") cancel();
  });
  screen.on("display-removed", () => cancel());
  screen.on("display-metrics-changed", () => cancel());
  return {
    cancel: () => cancel(),
    async open(): Promise<WindowPickerResult> {
      cancel();
      const attempt = generation;
      const initial = await list();
      if (attempt !== generation) return null;
      if (initial.permission !== "granted")
        throw Error(
          "Allow Refract to record your screen in macOS Settings, then choose a window again.",
        );
      sources = initial.windows.filter((source) => source.bounds);
      selected = null;
      return new Promise((resolve) => {
        finish = resolve;
        const active = screen.getDisplayNearestPoint(
          screen.getCursorScreenPoint(),
        ).id;
        for (const display of screen.getAllDisplays()) {
          const window = new BrowserWindow({
            ...display.bounds,
            frame: false,
            transparent: true,
            roundedCorners: false,
            resizable: false,
            movable: false,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            hasShadow: false,
            show: false,
            skipTaskbar: true,
            type: "panel",
            acceptFirstMouse: true,
            webPreferences: {
              preload: path.join(__dirname, "preload.cjs"),
              sandbox: true,
              contextIsolation: true,
              nodeIntegration: false,
            },
          });
          windows.set(window, display);
          window.setAlwaysOnTop(true, "floating", 1);
          window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
          window.once("ready-to-show", () => {
            if (!window.isDestroyed()) {
              window.showInactive();
              if (display.id === active) window.focus();
            }
          });
          window.on("closed", () => {
            if (windows.has(window)) cancel();
          });
          const loaded = process.env.REFRACT_DEV_URL
            ? window.loadURL(`${process.env.REFRACT_DEV_URL}/#window-picker`)
            : window.loadFile(path.join(__dirname, "../../dist/index.html"), {
                hash: "window-picker",
              });
          void loaded.catch(() => {
            if (attempt === generation) cancel();
          });
        }
        if (!windows.size) {
          cancel();
          return;
        }
        const refresh = async () => {
          try {
            const next = await list();
            if (attempt !== generation) return;
            if (next.permission !== "granted") {
              cancel();
              return;
            }
            sources = next.windows.filter((source) => source.bounds);
            if (!sources.some((source) => source.id === selected))
              selected = null;
            broadcast();
          } catch {
            if (attempt === generation) {
              cancel();
              return;
            }
          }
          if (attempt === generation) refreshTimer = setTimeout(refresh, 1500);
        };
        refreshTimer = setTimeout(refresh, 1500);
      });
    },
  };
}
