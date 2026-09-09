type Rect = { x: number; y: number; width: number; height: number };
export type RecorderPosition = {
  displayId: number;
  left: number;
  bottom: number;
};
export type RecorderDisplay = { id: number; workArea: Rect };

export function readRecorderPosition(
  value: unknown,
): RecorderPosition | undefined {
  if (!value || typeof value !== "object") return;
  const p = value as RecorderPosition;
  if (![p.displayId, p.left, p.bottom].every(Number.isFinite)) return;
  return { displayId: p.displayId, left: p.left, bottom: p.bottom };
}

export function rememberRecorderPosition(
  bounds: Rect,
  display: RecorderDisplay,
): RecorderPosition {
  return {
    displayId: display.id,
    left: bounds.x - display.workArea.x,
    bottom:
      display.workArea.y + display.workArea.height - bounds.y - bounds.height,
  };
}

export function recorderBounds(
  position: RecorderPosition | undefined,
  displays: RecorderDisplay[],
  primary: RecorderDisplay,
  expanded: boolean,
): Rect {
  const area = (displays.find((d) => d.id === position?.displayId) ?? primary)
    .workArea;
  const width = 855,
    height = expanded ? 404 : 64;
  return {
    x: Math.round(
      area.x +
        Math.max(
          0,
          Math.min(
            position?.left ?? (area.width - width) / 2,
            area.width - width,
          ),
        ),
    ),
    y: Math.round(
      area.y +
        Math.max(
          0,
          Math.min(
            area.height - height - (position?.bottom ?? 54),
            area.height - height,
          ),
        ),
    ),
    width,
    height,
  };
}
