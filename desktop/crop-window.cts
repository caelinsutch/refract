import { BrowserWindow, ipcMain } from "electron";
import { createEditorWindow } from "./editor-window.cjs";
import type { CropRect } from "../src/core/crop.js" with {
  "resolution-mode": "import",
};
export type CropRequest = {
  width: number;
  height: number;
  initial?: CropRect;
  image: string;
};
export function setupCropWindow(parent: BrowserWindow) {
  let child: BrowserWindow | null = null;
  let request: CropRequest | null = null;
  let complete: ((crop: CropRect | null) => void) | null = null;
  ipcMain.handle("crop-open", async (event, data: CropRequest) => {
    if (event.sender !== parent.webContents) throw Error("Unknown sender");
    if (child) {
      child.focus();
      return null;
    }
    if (
      !data ||
      !Number.isFinite(data.width) ||
      !Number.isFinite(data.height) ||
      data.width <= 0 ||
      data.height <= 0 ||
      data.width > 16384 ||
      data.height > 16384 ||
      typeof data.image !== "string" ||
      !data.image.startsWith("data:image/png;base64,") ||
      data.image.length > 100_000_000
    )
      throw Error("Invalid crop frame");
    request = data;
    const shell = createEditorWindow(parent, {
      title: "Crop recording",
      route: "crop",
      width: 960,
      height: 720,
      minWidth: 720,
      minHeight: 560,
    });
    child = shell.window;
    const current = child;
    const result = new Promise<CropRect | null>((resolve) => {
      complete = resolve;
    });
    current.on("closed", () => {
      child = null;
      request = null;
      complete?.(null);
      complete = null;
    });
    await shell.load();
    return result;
  });
  ipcMain.handle("crop-state", (event) => {
    if (event.sender !== child?.webContents) throw Error("Unknown sender");
    return request;
  });
  ipcMain.handle("crop-finish", async (event, crop: CropRect | null) => {
    if (event.sender !== child?.webContents || !request)
      throw Error("Unknown sender");
    if (crop) {
      const { clampCrop } = await import("../src/core/crop.js");
      if (![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite))
        throw Error("Invalid crop");
      crop = clampCrop(crop, request.width, request.height);
    }
    complete?.(crop);
    complete = null;
    child?.close();
  });
}
