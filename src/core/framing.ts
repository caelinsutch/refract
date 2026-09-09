import type { Project } from "./project.js";
/** Scale from the fitted screen to the content-filling zoom baseline. */
export function initialZoomScale(project: Project): number {
  const crop = project.crop ?? project.source;
  const [rw, rh] =
    project.appearance.ratio === "Auto"
      ? [crop.width, crop.height]
      : project.appearance.ratio.split(":").map(Number);
  const ratio = rw / rh;
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  if (ratio >= 1 && project.appearance.padding > 0) return 1;
  const width = ratio,
    height = 1;
  const padding = (Math.min(width, height) * project.appearance.padding) / 100;
  const innerWidth = width - 2 * padding,
    innerHeight = height - 2 * padding;
  const fit = Math.min(innerWidth / crop.width, innerHeight / crop.height);
  return Math.max(
    1,
    innerWidth / (crop.width * fit),
    innerHeight / (crop.height * fit),
  );
}
