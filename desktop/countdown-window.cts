import { BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";

/** Countdown owns no capture timer: the recorder remains the single clock. */
export function createCountdownWindow(cancel: () => void) {
  let window: BrowserWindow | null = null;
  let generation = 0;
  ipcMain.handle("countdown-cancel", (event) => {
    if (event.sender !== window?.webContents)
      throw Error("Unknown countdown sender.");
    cancel();
  });
  async function closeWindow() {
    const current = window;
    window = null;
    if (!current || current.isDestroyed()) return;
    await new Promise<void>((resolve) => {
      current.once("closed", resolve);
      current.close();
    });
  }
  function close() {
    generation++;
    return closeWindow();
  }
  return {
    close,
    update(seconds: number) {
      window?.webContents.send("countdown-tick", seconds);
    },
    async open(seconds: number, displayId?: number) {
      const attempt = ++generation;
      await closeWindow();
      if (attempt !== generation) return false;
      const display =
        screen.getAllDisplays().find((item) => item.id === displayId) ??
        screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const current = new BrowserWindow({
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
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      window = current;
      current.setAlwaysOnTop(true, "screen-saver");
      current.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      current.on("closed", () => {
        if (window === current) {
          window = null;
          cancel();
        }
      });
      const query = { seconds: String(seconds) };
      try {
        const dev = process.env.REFRACT_DEV_URL;
        if (dev)
          await current.loadURL(
            `${dev}/?${new URLSearchParams(query)}#countdown`,
          );
        else
          await current.loadFile(
            path.join(__dirname, "../../dist/index.html"),
            { hash: "countdown", query },
          );
        if (
          attempt !== generation ||
          current !== window ||
          current.isDestroyed()
        )
          return false;
        current.show();
        current.focus();
        return true;
      } catch (error) {
        if (current !== window) return false;
        await close();
        throw error;
      }
    },
  };
}
