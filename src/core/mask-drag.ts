import type { Mask, Project } from "./project";
import { videoGeometry } from "./compositor";
export function moveMask(
  p: Project,
  mask: Mask,
  time: number,
  width: number,
  height: number,
  dx: number,
  dy: number,
): Mask {
  if (dx === 0 && dy === 0) return mask;
  const g = videoGeometry(p, time, width, height);
  return {
    ...mask,
    x: Math.max(
      0,
      Math.min(1 - mask.width, mask.x + ((dx / g.w) * g.cw) / p.source.width),
    ),
    y: Math.max(
      0,
      Math.min(1 - mask.height, mask.y + ((dy / g.h) * g.ch) / p.source.height),
    ),
  };
}

export type MaskHandle = "nw" | "ne" | "sw" | "se" | "move";
export function maskRectangle(
  p: Project,
  mask: Mask,
  time: number,
  width: number,
  height: number,
) {
  const g = videoGeometry(p, time, width, height);
  return {
    x: g.x + ((mask.x * p.source.width - g.sx) / g.cw) * g.w,
    y: g.y + ((mask.y * p.source.height - g.sy) / g.ch) * g.h,
    width: ((mask.width * p.source.width) / g.cw) * g.w,
    height: ((mask.height * p.source.height) / g.ch) * g.h,
  };
}
export function maskHandleAt(
  p: Project,
  mask: Mask,
  time: number,
  width: number,
  height: number,
  x: number,
  y: number,
): MaskHandle | null {
  const r = maskRectangle(p, mask, time, width, height);
  for (const [handle, hx, hy] of [
    ["nw", r.x, r.y],
    ["ne", r.x + r.width, r.y],
    ["sw", r.x, r.y + r.height],
    ["se", r.x + r.width, r.y + r.height],
  ] as const) {
    if (Math.abs(x - hx) <= 8 && Math.abs(y - hy) <= 8) return handle;
  }
  return null;
}
export function dragMask(
  p: Project,
  mask: Mask,
  time: number,
  width: number,
  height: number,
  dx: number,
  dy: number,
  handle: MaskHandle,
): Mask {
  if (handle === "move") return moveMask(p, mask, time, width, height, dx, dy);
  const g = videoGeometry(p, time, width, height);
  const mx = ((dx / g.w) * g.cw) / p.source.width,
    my = ((dy / g.h) * g.ch) / p.source.height;
  const right = Math.min(1, mask.x + mask.width),
    bottom = Math.min(1, mask.y + mask.height);
  const minimumX = 1 / p.source.width,
    minimumY = 1 / p.source.height;
  const x = handle.endsWith("w")
    ? Math.max(0, Math.min(right - minimumX, mask.x + mx))
    : mask.x;
  const y = handle.startsWith("n")
    ? Math.max(0, Math.min(bottom - minimumY, mask.y + my))
    : mask.y;
  const endX = handle.endsWith("e")
    ? Math.min(1, Math.max(x + minimumX, right + mx))
    : right;
  const endY = handle.startsWith("s")
    ? Math.min(1, Math.max(y + minimumY, bottom + my))
    : bottom;
  return { ...mask, x, y, width: endX - x, height: endY - y };
}
/** Editor-only adornment, drawn after the shared composition renderer. */
export function drawMaskSelection(
  c: CanvasRenderingContext2D,
  p: Project,
  mask: Mask,
  time: number,
  width: number,
  height: number,
  pixelRatio: number,
) {
  const g = videoGeometry(p, time, width, height);
  if (g.source < mask.start || g.source >= mask.end) return;
  const r = maskRectangle(p, mask, time, width, height),
    size = 6 * pixelRatio;
  c.save();
  c.beginPath();
  c.rect(g.x, g.y, g.w, g.h);
  c.clip();
  c.strokeStyle = "#000000";
  c.lineWidth = 3 * pixelRatio;
  c.strokeRect(r.x, r.y, r.width, r.height);
  c.strokeStyle = "#ffffff";
  c.lineWidth = pixelRatio;
  c.strokeRect(r.x, r.y, r.width, r.height);
  c.fillStyle = "#ffffff";
  c.strokeStyle = "#000000";
  for (const [x, y] of [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x, r.y + r.height],
    [r.x + r.width, r.y + r.height],
  ]) {
    c.fillRect(x - size / 2, y - size / 2, size, size);
    c.strokeRect(x - size / 2, y - size / 2, size, size);
  }
  c.restore();
}
