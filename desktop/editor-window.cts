import { BrowserWindow, screen } from "electron";
import path from "node:path";
/** Shared native task-window shell. Feature modules own their payload and result IPC. */
export function createEditorWindow(
  parent: BrowserWindow,
  options: {
    title: string;
    route: string;
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
  },
) {
  const area = screen.getDisplayMatching(parent.getBounds()).workArea;
  const width = Math.min(options.width, area.width),
    height = Math.min(options.height, area.height);
  const window = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(options.minWidth, width),
    minHeight: Math.min(options.minHeight, height),
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    parent,
    show: false,
    title: options.title,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 22, y: 22 },
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: "#00000000",
    vibrancy: "under-window",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (e) => e.preventDefault());
  window.webContents.on("page-title-updated", (e) => e.preventDefault());
  window.webContents.on("render-process-gone", () => {
    if (!window.isDestroyed()) window.close();
  });
  window.once("ready-to-show", () => {
    if (!window.isDestroyed()) window.show();
  });
  window.once("closed", () => {
    if (!parent.isDestroyed()) {
      parent.show();
      parent.focus();
    }
  });
  const load = async () => {
    try {
      if (process.env.REFRACT_DEV_URL) {
        const url = new URL(process.env.REFRACT_DEV_URL);
        url.hash = options.route;
        await window.loadURL(url.toString());
      } else
        await window.loadFile(path.join(__dirname, "../../dist/index.html"), {
          hash: options.route,
        });
    } catch {
      if (!window.isDestroyed()) window.close();
    }
  };
  return { window, load };
}
