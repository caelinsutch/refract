import { sourceAt, type Project } from "./project";

export function cursorExposure(p: Project, time: number) {
  const at = sourceAt(p, time);
  if (!at) return [];
  const amount =
    (p.appearance.cursorMotionBlur ?? 0) * (p.appearance.motionBlurAmount ?? 1);
  if (amount <= 0) return [at.time];
  // A fixed output-time shutter keeps preview/export independent of display refresh.
  const exposure = (1000 / 60) * amount * at.segment.speed;
  return Array.from({ length: 12 }, (_, i) =>
    Math.max(at.segment.start, at.time - exposure * (1 - i / 11)),
  );
}

type Point = { x: number; y: number };
type Surface = HTMLCanvasElement | OffscreenCanvas;
const surfaces = new WeakMap<
  CanvasRenderingContext2D,
  { size: number; texture: Surface; layer: Surface }
>();
export function createRenderSurface(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
): Surface {
  if (typeof OffscreenCanvas !== "undefined")
    return new OffscreenCanvas(width, height);
  if (c.canvas.ownerDocument) {
    const canvas = c.canvas.ownerDocument.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  // Native Canvas used by the compositor verifier.
  return new (
    c.canvas.constructor as new (
      width: number,
      height: number,
    ) => HTMLCanvasElement
  )(width, height);
}
function pointer(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, 23);
  c.lineTo(6, 17);
  c.lineTo(11, 27);
  c.lineTo(15, 25);
  c.lineTo(10, 15);
  c.lineTo(19, 15);
  c.closePath();
  c.fillStyle = "#101010";
  c.strokeStyle = "white";
  c.lineWidth = 1.5;
  c.fill();
  c.stroke();
  c.restore();
}
/** Average premultiplied pointer samples, then composite the result only once. */
export function drawCursorExposure(
  c: CanvasRenderingContext2D,
  points: Point[],
  size: number,
) {
  if (!points.length) return;
  const last = points.at(-1)!;
  if (
    points.every(
      (p) => Math.abs(p.x - last.x) < 0.01 && Math.abs(p.y - last.y) < 0.01,
    )
  ) {
    pointer(c, last.x, last.y, size);
    return;
  }
  const pad = Math.ceil(size * 2 + 2);
  let cached = surfaces.get(c);
  if (!cached || cached.size !== size) {
    const texture = createRenderSurface(
      c,
      Math.ceil(20 * size + pad * 2),
      Math.ceil(28 * size + pad * 2),
    );
    pointer(
      texture.getContext("2d") as CanvasRenderingContext2D,
      pad,
      pad,
      size,
    );
    cached = { size, texture, layer: createRenderSurface(c, 1, 1) };
    surfaces.set(c, cached);
  }
  const { texture, layer } = cached;
  const left = Math.floor(Math.min(...points.map((p) => p.x))) - pad;
  const top = Math.floor(Math.min(...points.map((p) => p.y))) - pad;
  const width = Math.ceil(
    Math.max(...points.map((p) => p.x)) - left + texture.width,
  );
  const height = Math.ceil(
    Math.max(...points.map((p) => p.y)) - top + texture.height,
  );
  if (layer.width < width) layer.width = Math.ceil(width / 64) * 64;
  if (layer.height < height) layer.height = Math.ceil(height / 64) * 64;
  const lc = layer.getContext("2d") as CanvasRenderingContext2D;
  lc.clearRect(0, 0, layer.width, layer.height);
  lc.globalCompositeOperation = "lighter";
  lc.globalAlpha = 1 / points.length;
  for (const p of points)
    lc.drawImage(texture, p.x - left - pad, p.y - top - pad);
  c.drawImage(layer, left, top);
}
