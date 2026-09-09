import { sourceAt, zoomAt, type Project } from "./project";
import { createRenderSurface } from "./cursor-render";
type Transform = ReturnType<typeof zoomAt>;
export function screenExposure(p: Project, t: number): Transform[] {
  const at = sourceAt(p, t);
  const current = zoomAt(p, at?.time ?? 0);
  const move = p.appearance.screenMoveBlur ?? 0,
    zoom = p.appearance.screenZoomBlur ?? 0;
  if (!at || (!move && !zoom) || p.appearance.animation === "instant")
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
) {
  if (transforms.length === 1) {
    paint(c, transforms[0]);
    return;
  }
  let cached = layers.get(c);
  if (
    !cached ||
    cached.sample.width !== width ||
    cached.sample.height !== height
  ) {
    cached = {
      sample: createRenderSurface(c, width, height),
      sum: createRenderSurface(c, width, height),
    };
    layers.set(c, cached);
  }
  const sample = cached.sample.getContext("2d") as CanvasRenderingContext2D,
    sum = cached.sum.getContext("2d") as CanvasRenderingContext2D;
  sum.clearRect(0, 0, width, height);
  sum.globalCompositeOperation = "lighter";
  sum.globalAlpha = 1 / transforms.length;
  for (const transform of transforms) {
    sample.clearRect(0, 0, width, height);
    paint(sample, transform);
    sum.drawImage(cached.sample, 0, 0);
  }
  c.drawImage(cached.sum, 0, 0);
}
