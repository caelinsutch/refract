import type { Project } from "./project.js";
/** The reference suppresses animation in a 100ms neighborhood of instant boundaries. */
export function instantZoomAt(project: Project, time: number): boolean {
  return project.zooms.some(
    (zoom) =>
      !zoom.disabled &&
      zoom.instantAnimation &&
      [zoom.start, zoom.end].some(
        (boundary) => time >= boundary - 100 && time < boundary + 100,
      ),
  );
}
