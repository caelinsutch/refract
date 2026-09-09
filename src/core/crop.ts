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
  ratio?: number | null,
): CropRect {
  if (edge === "move")
    return clampCrop(
      { ...rect, x: rect.x + dx, y: rect.y + dy },
      width,
      height,
    );
  if (ratio && ratio > 0 && Number.isFinite(ratio)) {
    const horizontal = edge.includes("w") || edge.includes("e");
    const vertical = edge.includes("n") || edge.includes("s");
    const anchorX = edge.includes("w")
      ? rect.x + rect.width
      : horizontal
        ? rect.x
        : rect.x + rect.width / 2;
    const anchorY = edge.includes("n")
      ? rect.y + rect.height
      : vertical
        ? rect.y
        : rect.y + rect.height / 2;
    const availableWidth = horizontal
      ? edge.includes("w")
        ? anchorX
        : width - anchorX
      : 2 * Math.min(anchorX, width - anchorX);
    const availableHeight = vertical
      ? edge.includes("n")
        ? anchorY
        : height - anchorY
      : 2 * Math.min(anchorY, height - anchorY);
    const useX =
      horizontal && (!vertical || Math.abs(dx) >= Math.abs(dy * ratio));
    const requested = useX
      ? rect.width + (edge.includes("w") ? -dx : dx)
      : (rect.height + (edge.includes("n") ? -dy : dy)) * ratio;
    const w = Math.min(
      availableWidth,
      availableHeight * ratio,
      Math.max(Math.max(1, ratio), requested),
    );
    const h = w / ratio;
    return clampCrop(
      {
        x: edge.includes("w")
          ? anchorX - w
          : horizontal
            ? anchorX
            : anchorX - w / 2,
        y: edge.includes("n")
          ? anchorY - h
          : vertical
            ? anchorY
            : anchorY - h / 2,
        width: w,
        height: h,
      },
      width,
      height,
    );
  }
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

/** Empty/intermediate numeric input must not collapse the current selection. */
export function editCropField(
  rect: CropRect,
  key: keyof CropRect,
  text: string,
  width: number,
  height: number,
  ratio?: number | null,
): CropRect {
  if (!text.trim()) return rect;
  const value = Number(text);
  if (!Number.isFinite(value)) return rect;
  if (
    ratio &&
    ratio > 0 &&
    Number.isFinite(ratio) &&
    (key === "width" || key === "height")
  ) {
    const w = Math.max(
      Math.max(1, ratio),
      key === "width" ? value : value * ratio,
    );
    const fittedWidth = Math.min(w, width, height * ratio);
    return clampCrop(
      { ...rect, width: fittedWidth, height: fittedWidth / ratio },
      width,
      height,
    );
  }
  return clampCrop({ ...rect, [key]: value }, width, height);
}
