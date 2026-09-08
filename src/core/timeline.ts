import { duration, sourceAt, type Project, type Zoom } from "./project";

/** Project the surviving portion of a source interval onto the edited clock. */
export function visibleRange(
  p: Project,
  range: { start: number; end: number },
) {
  let offset = 0;
  let start = Infinity,
    end = -Infinity;
  for (const segment of p.segments) {
    const left = Math.max(range.start, segment.start);
    const right = Math.min(range.end, segment.end);
    if (right > left) {
      start = Math.min(start, offset + (left - segment.start) / segment.speed);
      end = Math.max(end, offset + (right - segment.start) / segment.speed);
    }
    offset += (segment.end - segment.start) / segment.speed;
  }
  return Number.isFinite(start) ? { start, end } : null;
}

function sourceBoundary(p: Project, time: number, edge: "start" | "end") {
  // At a cut, the end belongs to the outgoing clip and the start to the incoming.
  if (edge === "end") {
    let offset = 0;
    for (const s of p.segments) {
      const length = (s.end - s.start) / s.speed;
      if (time >= offset && time <= offset + length)
        return s.start + (time - offset) * s.speed;
      offset += length;
    }
  }
  return sourceAt(p, time)?.time ?? 0;
}

export function dragZoomRange(
  p: Project,
  z: Zoom,
  side: "start" | "end" | "move",
  delta: number,
): Zoom {
  const range = visibleRange(p, z);
  if (!range || delta === 0) return z;
  const total = duration(p);
  let { start, end } = range;
  if (side === "move") {
    const length = end - start;
    start = Math.max(0, Math.min(total - length, start + delta));
    end = start + length;
  } else if (side === "start")
    start = Math.max(0, Math.min(end, start + delta));
  else end = Math.max(start, Math.min(total, end + delta));
  const next = {
    ...z,
    start: side === "end" ? z.start : sourceBoundary(p, start, "start"),
    end: side === "start" ? z.end : sourceBoundary(p, end, "end"),
  };
  return next.end - next.start >= 200 ? next : z;
}
