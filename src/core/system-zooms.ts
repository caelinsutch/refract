import type { Project, Zoom } from "./project.js";
export function isVerticalRatio(ratio: string): boolean {
  if (ratio === "Auto") return false;
  const [width, height] = ratio.split(":").map(Number);
  return (
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > width
  );
}
/** Fill uncovered source-time intervals without modifying editable project zooms. */
export function effectiveZooms(project: Project): Zoom[] {
  const explicit = project.zooms.filter((zoom) => !zoom.disabled);
  if (
    !project.appearance.alwaysKeepZoomedIn ||
    !isVerticalRatio(project.appearance.ratio)
  )
    return explicit;
  const end = project.source.duration;
  const gaps: Zoom[] = [];
  const add = (start: number, finish: number) => {
    if (finish > start)
      gaps.push({
        id: `system-follow-${start}`,
        start,
        end: finish,
        scale: 1,
        x: 0.5,
        y: 0.5,
        mode: "auto",
        disabled: false,
      });
  };
  let next = 0;
  for (const zoom of [...explicit].sort((a, b) => a.start - b.start)) {
    // The reference leaves a one-millisecond guard around explicit ranges.
    const start = Math.max(0, zoom.start - 1),
      finish = Math.min(end, zoom.end + 1);
    add(next, Math.min(end, start));
    next = Math.max(next, finish);
  }
  add(next, end);
  return [...explicit, ...gaps].sort((a, b) => a.start - b.start);
}
