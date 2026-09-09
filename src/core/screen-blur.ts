import { instantZoomAt } from "./instant-zoom";
import { sourceAt, zoomAt, type Project } from "./project";
import { createRenderSurface } from "./cursor-render";
type Transform = ReturnType<typeof zoomAt>;
export function screenExposure(p: Project, t: number): Transform[] {
  const at = sourceAt(p, t);
  const current = zoomAt(p, at?.time ?? 0);
  const amount = p.appearance.motionBlurAmount ?? 1;
  const move = (p.appearance.screenMoveBlur ?? 0) * amount,
    zoom = (p.appearance.screenZoomBlur ?? 0) * amount;
  if (
    !at ||
    (!move && !zoom) ||
    p.appearance.animation === "instant" ||
    instantZoomAt(p, at.time)
  )
    return [current];
  const samples = Array.from({ length: 12 }, (_, i) => {
    const time = Math.max(
      at.segment.start,
      at.time - (1000 / 60) * at.segment.speed * (1 - i / 11),
    );
    const previous = zoomAt(p, time);
    return {
      ...current,
      x: current.x + (previous.x - current.x) * move,
      y: current.y + (previous.y - current.y) * move,
      scale: current.scale + (previous.scale - current.scale) * zoom,
    };
  });
  return samples.every(
    (v) =>
      Math.abs(v.x - current.x) < 1e-8 &&
      Math.abs(v.y - current.y) < 1e-8 &&
      Math.abs(v.scale - current.scale) < 1e-8,
  )
    ? [current]
    : samples;
}
const layers = new WeakMap<
  CanvasRenderingContext2D,
  {
    sample: ReturnType<typeof createRenderSurface>;
    sum: ReturnType<typeof createRenderSurface>;
  }
>();
/** Isolate each masked recording sample before averaging its premultiplied pixels. */
export function drawScreenExposure(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  transforms: Transform[],
  paint: (context: CanvasRenderingContext2D, transform: Transform) => void,
  bounds?: { x: number; y: number; width: number; height: number },
) {
  if (transforms.length === 1) {
    paint(c, transforms[0]);
    return;
  }
  // Chromium filters can round edge pixels differently on off-canvas surfaces.
  // Keep the established full-frame path when any recording edge is outside.
  if (
    bounds &&
    (bounds.x < 0 ||
      bounds.y < 0 ||
      bounds.x + bounds.width > width ||
      bounds.y + bounds.height > height)
  ) {
    bounds = undefined;
  }
  // Integer origins preserve the full-frame pixel grid, including fractional clips.
  const left = Math.max(0, Math.min(width, Math.floor(bounds?.x ?? 0)));
  const top = Math.max(0, Math.min(height, Math.floor(bounds?.y ?? 0)));
  const right = Math.max(
    left,
    Math.min(width, Math.ceil(bounds ? bounds.x + bounds.width : width)),
  );
  const bottom = Math.max(
    top,
    Math.min(height, Math.ceil(bounds ? bounds.y + bounds.height : height)),
  );
  const bufferWidth = right - left,
    bufferHeight = bottom - top;
  if (!bufferWidth || !bufferHeight) return;
  let cached = layers.get(c);
  if (
    !cached ||
    cached.sample.width !== bufferWidth ||
    cached.sample.height !== bufferHeight
  ) {
    cached = {
      sample: createRenderSurface(c, bufferWidth, bufferHeight),
      sum: createRenderSurface(c, bufferWidth, bufferHeight),
    };
    layers.set(c, cached);
  }
  const sample = cached.sample.getContext("2d") as CanvasRenderingContext2D,
    sum = cached.sum.getContext("2d") as CanvasRenderingContext2D;
  sum.clearRect(0, 0, bufferWidth, bufferHeight);
  sum.globalCompositeOperation = "lighter";
  sum.globalAlpha = 1 / transforms.length;
  for (const transform of transforms) {
    sample.clearRect(0, 0, bufferWidth, bufferHeight);
    sample.save();
    sample.translate(-left, -top);
    try {
      paint(sample, transform);
    } finally {
      sample.restore();
    }
    sum.drawImage(cached.sample, 0, 0);
  }
  c.drawImage(cached.sum, left, top);
}
