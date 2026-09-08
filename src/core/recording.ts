import {
  createProject,
  uid,
  type Project,
  type CursorEvent,
} from "./project.js";
/** Prepare a reopenable project before notifying the editor that capture finished. */
export function recordedProject(
  source: Project["source"],
  events: CursorEvent[],
  title: string,
): Project {
  const p = createProject(source, title);
  p.cursor = events
    .filter(
      (e) =>
        [e.time, e.x, e.y].every(Number.isFinite) &&
        e.time >= 0 &&
        e.time <= source.duration,
    )
    .map((e) => ({
      ...e,
      x: Math.max(0, Math.min(1, e.x)),
      y: Math.max(0, Math.min(1, e.y)),
    }))
    .sort((a, b) => a.time - b.time);
  let lastEnd = 0;
  for (const click of p.cursor.filter((e) => e.click)) {
    if (click.time < lastEnd) continue;
    const start = Math.max(0, click.time - 300),
      end = Math.min(source.duration, click.time + 2500);
    if (end - start < 200) continue;
    p.zooms.push({
      id: uid(),
      start,
      end,
      scale: 2,
      x: click.x,
      y: click.y,
      mode: "auto",
      disabled: false,
    });
    lastEnd = end;
  }
  return p;
}
