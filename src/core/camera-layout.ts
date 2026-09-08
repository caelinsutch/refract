import type { Project } from "./project.js";
export type CameraLayout = {
  id: string;
  start: number;
  end: number;
  type: "default" | "fullscreen" | "hidden";
  x: number;
  y: number;
};
export type CameraFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  opacity: number;
};

/** Seek-independent transition evaluation; a new boundary starts at the current presentation. */
export function cameraFrameAt(
  p: Project,
  source: number,
  width: number,
  height: number,
  zoom: number,
): CameraFrame {
  const a = p.appearance;
  const scale = width / 1280;
  const cameraScale = 1 - (1 - a.cameraZoomScale) * Math.min(1, zoom - 1);
  const size = Math.min(width, height) * a.cameraSize * cameraScale;
  const margin = 25 * scale;
  const target = (layout?: CameraLayout): CameraFrame => {
    if (layout?.type === "fullscreen")
      return { x: 0, y: 0, width, height, radius: 0, opacity: 1 };
    return {
      x: margin + (width - size - margin * 2) * (layout?.x ?? a.cameraX),
      y: margin + (height - size - margin * 2) * (layout?.y ?? a.cameraY),
      width: size,
      height: size,
      radius: size * a.cameraRoundness,
      opacity: layout?.type === "hidden" ? 0 : 1,
    };
  };
  const events = (p.cameraLayouts ?? [])
    .flatMap((layout) => [
      { time: layout.start, layout, order: 1 },
      { time: layout.end, layout: undefined, order: 0 },
    ])
    .sort((a, b) => a.time - b.time || a.order - b.order);
  let from = target(),
    to = from,
    start = 0;
  const duration = a.animation === "instant" ? 0 : 300;
  const evaluate = (time: number) => {
    const t = duration
      ? Math.max(0, Math.min(1, (time - start) / duration))
      : 1;
    const weight = t * t * (3 - 2 * t);
    return Object.fromEntries(
      Object.keys(to).map((key) => {
        const k = key as keyof CameraFrame;
        return [key, from[k] + (to[k] - from[k]) * weight];
      }),
    ) as CameraFrame;
  };
  for (const event of events) {
    if (event.time > source) break;
    from = evaluate(event.time);
    to = target(event.layout);
    start = event.time;
    if (start === 0) from = to;
  }
  const result = evaluate(source);
  if (a.cameraHidden) result.opacity = 0;
  return result;
}
