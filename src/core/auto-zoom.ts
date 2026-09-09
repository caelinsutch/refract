import { initialZoomScale } from "./framing.js";
import type { Project, Zoom } from "./project.js";
export type AutoZoomTarget = { time: number; x: number; y: number };
/** Group consecutive cursor samples until their bounds exceed the visible-area allowance. */
export function autoZoomTargets(
  project: Project,
  zoom: Zoom,
): AutoZoomTarget[] {
  let samples = project.cursor.filter(
    (point) => point.time >= zoom.start && point.time <= zoom.end,
  );
  if (!samples.length) {
    const nearest =
      project.cursor.findLast((point) => point.time <= zoom.start) ??
      project.cursor.find((point) => point.time > zoom.start);
    if (nearest) samples = [nearest];
  }
  const crop = project.crop ?? {
    width: project.source.width,
    height: project.source.height,
  };
  const scale = zoom.scale * initialZoomScale(project);
  const width = (crop.width / project.source.width / scale) * 0.5;
  const height = (crop.height / project.source.height / scale) * 0.7;
  const targets: AutoZoomTarget[] = [];
  let left = 0,
    right = 0,
    top = 0,
    bottom = 0;
  for (const point of samples) {
    if (
      !targets.length ||
      Math.max(right, point.x) - Math.min(left, point.x) > width ||
      Math.max(bottom, point.y) - Math.min(top, point.y) > height
    ) {
      left = right = point.x;
      top = bottom = point.y;
      targets.push({
        time: Math.max(zoom.start, point.time),
        x: point.x,
        y: point.y,
      });
    } else {
      left = Math.min(left, point.x);
      right = Math.max(right, point.x);
      top = Math.min(top, point.y);
      bottom = Math.max(bottom, point.y);
      Object.assign(targets[targets.length - 1], {
        x: (left + right) / 2,
        y: (top + bottom) / 2,
      });
    }
  }
  return targets;
}
