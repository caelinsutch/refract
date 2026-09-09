import type { Project } from "./project.js";
import { initialZoomScale } from "./framing.js";
/** Remap automatic targets through edge bands limited by the visible content area. */
export function snapAutoTarget(
  project: Project,
  point: { x: number; y: number },
  scale: number,
  amount: number,
) {
  if (amount <= 0) return point;
  const crop = project.crop ?? {
    x: 0,
    y: 0,
    width: project.source.width,
    height: project.source.height,
  };
  const [rw, rh] =
    project.appearance.ratio === "Auto"
      ? [crop.width, crop.height]
      : project.appearance.ratio.split(":").map(Number);
  const width = rw / rh,
    height = 1,
    padding = (Math.min(width, height) * project.appearance.padding) / 100;
  const initial = initialZoomScale(project);
  const axis = (value: number, extent: number, content: number) => {
    const band = Math.max(
      0,
      Math.min(amount, extent / initial / scale / content),
    );
    return Math.max(0, Math.min(1, (value - band) / (1 - 2 * band + 0.0001)));
  };
  return {
    x:
      (crop.x +
        axis(
          (point.x * project.source.width - crop.x) / crop.width,
          width,
          width - 2 * padding,
        ) *
          crop.width) /
      project.source.width,
    y:
      (crop.y +
        axis(
          (point.y * project.source.height - crop.y) / crop.height,
          height,
          height - 2 * padding,
        ) *
          crop.height) /
      project.source.height,
  };
}
