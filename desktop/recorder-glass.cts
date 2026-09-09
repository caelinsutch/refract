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

export function updateRecorderPanelGlass(
  window: BrowserWindow,
  rect: unknown,
): boolean {
  if (process.platform !== "darwin") return false;
  if (rect !== null) {
    if (!rect || typeof rect !== "object") return false;
    const r = rect as Record<string, unknown>;
    if (
      !["x", "y", "width", "height"].every(
        (key) => typeof r[key] === "number" && Number.isFinite(r[key]),
      )
    )
      return false;
    const { width, height } = window.getContentBounds();
    if (
      Number(r.x) < 0 ||
      Number(r.y) < 0 ||
      Number(r.width) <= 0 ||
      Number(r.height) <= 0 ||
      Number(r.x) + Number(r.width) > width + 1 ||
      Number(r.y) + Number(r.height) > height + 1
    )
      return false;
  }
  try {
    const native = require(
      path.join(__dirname, "../../native/.build/recorder-glass.node"),
    ) as { panel(handle: Buffer, rect: string): boolean };
    return native.panel(window.getNativeWindowHandle(), JSON.stringify(rect));
  } catch {
    return false;
  }
}
