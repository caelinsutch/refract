export type CaptureArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};
/** Pointer capture may deliver coordinates outside the display-sized overlay. */
export function captureAreaBetween(
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number,
): CaptureArea {
  const clamp = (value: number, limit: number) =>
    Math.max(0, Math.min(limit, value));
  const x1 = clamp(start.x, width),
    y1 = clamp(start.y, height);
  const x2 = clamp(end.x, width),
    y2 = clamp(end.y, height);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}
