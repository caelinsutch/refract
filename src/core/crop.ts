export type CropRect = { x: number; y: number; width: number; height: number };
export function clampCrop(
  rect: CropRect,
  width: number,
  height: number,
): CropRect {
  const w = Math.max(1, Math.min(width, Math.round(rect.width)));
  const h = Math.max(1, Math.min(height, Math.round(rect.height)));
  return {
    x: Math.max(0, Math.min(width - w, Math.round(rect.x))),
    y: Math.max(0, Math.min(height - h, Math.round(rect.y))),
    width: w,
    height: h,
  };
}
export function resizeCrop(
  rect: CropRect,
  edge: string,
  dx: number,
  dy: number,
  width: number,
  height: number,
): CropRect {
  if (edge === "move")
    return clampCrop(
      { ...rect, x: rect.x + dx, y: rect.y + dy },
      width,
      height,
    );
  let left = rect.x,
    top = rect.y,
    right = left + rect.width,
    bottom = top + rect.height;
  if (edge.includes("w")) left = Math.max(0, Math.min(right - 1, left + dx));
  if (edge.includes("e"))
    right = Math.min(width, Math.max(left + 1, right + dx));
  if (edge.includes("n")) top = Math.max(0, Math.min(bottom - 1, top + dy));
  if (edge.includes("s"))
    bottom = Math.min(height, Math.max(top + 1, bottom + dy));
  return clampCrop(
    { x: left, y: top, width: right - left, height: bottom - top },
    width,
    height,
  );
}
