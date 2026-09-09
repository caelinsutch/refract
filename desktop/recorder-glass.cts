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

let symbols: Record<string, string> | undefined;
export function recorderSymbols(): Record<string, string> {
  if (symbols) return symbols;
  if (process.platform !== "darwin") return {};
  try {
    const native = require(
      path.join(__dirname, "../../native/.build/recorder-glass.node"),
    ) as { symbolAtlas(): string };
    symbols = JSON.parse(native.symbolAtlas()) as Record<string, string>;
    return symbols;
  } catch (error) {
    console.warn("System symbols unavailable; using fallback icons", error);
    return {};
  }
}
