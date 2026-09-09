import { BrowserWindow, ipcMain, screen, type WebContents } from "electron";
import path from "node:path";

/** One overlay per display; the recorder bar is never resized to host the picker. */
export function createDisplayPicker() {
  const windows = new Map<BrowserWindow, number>();
  let complete: ((id: number | null) => void) | undefined;
  function cancel(id: number | null = null) {
    const resolve = complete;
    complete = undefined;
    const open = [...windows.keys()];
    windows.clear();
    const live = open.filter((window) => !window.isDestroyed());
    let remaining = live.length;
    if (!remaining) resolve?.(id);
    for (const window of live) {
      window.once("closed", () => {
        if (--remaining === 0) resolve?.(id);
      });
      window.close();
    }
  }
  ipcMain.handle("display-picker-finish", (event, accepted: boolean) => {
    const entry = [...windows].find(
      ([window]) => window.webContents === event.sender,
    );
    if (!entry) throw Error("Unknown display picker sender.");
    cancel(accepted === true ? entry[1] : null);
  });
  const displayChanged = () => cancel();
  screen.on("display-removed", displayChanged);
  screen.on("display-metrics-changed", displayChanged);
  return {
    owns(sender: WebContents) {
      return [...windows.keys()].some(
        (window) => window.webContents === sender,
      );
    },
    cancel: () => cancel(),
    open(selectedId?: number): Promise<number | null> {
      cancel();
      return new Promise((resolve) => {
        complete = resolve;
        const displays = screen.getAllDisplays();
        const active = displays.some((display) => display.id === selectedId)
          ? selectedId
          : screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;
        for (const display of displays) {
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
            title: "Refract — Select display",
            type: "panel",
            acceptFirstMouse: true,
            webPreferences: {
              preload: path.join(__dirname, "preload.cjs"),
              sandbox: true,
              contextIsolation: true,
              nodeIntegration: false,
            },
          });
          windows.set(window, display.id);
          window.setAlwaysOnTop(true, "floating", 1);
          window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
          window.on("closed", () => {
            if (windows.has(window)) cancel();
          });
          window.once("ready-to-show", () => {
            if (window.isDestroyed()) return;
            window.showInactive();
            if (display.id === active) window.focus();
          });
          const query = {
            name: display.label || "Display",
            width: String(display.bounds.width),
            height: String(display.bounds.height),
            fps: String(Math.round(display.displayFrequency)),
            selected: String(display.id === active),
          };
          const dev = process.env.REFRACT_DEV_URL;
          const loaded = dev
            ? window.loadURL(
                `${dev}/?${new URLSearchParams(query)}#display-picker`,
              )
            : window.loadFile(path.join(__dirname, "../../dist/index.html"), {
                hash: "display-picker",
                query,
              });
          void loaded.catch(() => cancel());
        }
        if (!displays.length) cancel();
      });
    },
  };
}
