import type { BrowserWindow } from "electron";
import path from "node:path";

/** Install once; AppKit owns material updates and follows the system appearance. */
export function installRecorderGlass(window: BrowserWindow): boolean {
  if (process.platform !== "darwin") return false;
  try {
    const glass = require(
      path.join(__dirname, "../../native/.build/recorder-glass.node"),
    ) as {
      install(handle: Buffer): boolean;
    };
    return glass.install(window.getNativeWindowHandle());
  } catch (error) {
    console.warn(
      "Native recorder glass unavailable; retaining opaque fallback",
      error,
    );
    return false;
  }
}
