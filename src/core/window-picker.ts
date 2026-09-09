import type { CaptureSource } from "./recorder.js";
type Rect = { x: number; y: number; width: number; height: number };
function valid(rect: Rect): boolean {
  return (
    Object.values(rect).every(Number.isFinite) &&
    rect.width > 0 &&
    rect.height > 0
  );
}
/** Coordinates remain in logical desktop points, including negative display origins. */
export function windowAtPoint(
  windows: readonly CaptureSource[],
  x: number,
  y: number,
): CaptureSource | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  let selected: CaptureSource | null = null;
  for (const window of windows) {
    const r = window.bounds;
    if (
      !r ||
      !valid(r) ||
      x < r.x ||
      y < r.y ||
      x >= r.x + r.width ||
      y >= r.y + r.height
    )
      continue;
    if (!selected || (window.order ?? Infinity) < (selected.order ?? Infinity))
      selected = window;
  }
  return selected;
}
/** Pick the screen containing most of the window, rather than whichever owns the toolbar. */
export function windowDisplayId(
  bounds: Rect,
  displays: readonly { id: number; bounds: Rect }[],
): number | null {
  if (!valid(bounds)) return null;
  let best: number | null = null,
    bestArea = 0;
  for (const display of displays) {
    const r = display.bounds;
    if (!valid(r)) continue;
    const width = Math.max(
      0,
      Math.min(bounds.x + bounds.width, r.x + r.width) -
        Math.max(bounds.x, r.x),
    );
    const height = Math.max(
      0,
      Math.min(bounds.y + bounds.height, r.y + r.height) -
        Math.max(bounds.y, r.y),
    );
    if (width * height > bestArea) {
      best = display.id;
      bestArea = width * height;
    }
  }
  return best;
}
