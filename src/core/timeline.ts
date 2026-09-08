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

/** Source-time bounds shared by timeline handles and numeric trim controls. */
export function clipTrimBounds(p: Project, id: string) {
  const index = p.segments.findIndex((s) => s.id === id);
  if (index < 0) return null;
  const clip = p.segments[index];
  // A valid short split must not expand merely because its handle was touched.
  const minimum = Math.min(100, clip.end - clip.start);
  return {
    startMin: index > 0 ? p.segments[index - 1].end : 0,
    startMax: clip.end - minimum,
    endMin: clip.start + minimum,
    endMax:
      index + 1 < p.segments.length
        ? p.segments[index + 1].start
        : p.source.duration,
  };
}

/** Ripple trim in edited milliseconds, constrained by adjacent retained footage. */
export function trimClip(
  p: Project,
  id: string,
  side: "start" | "end",
  delta: number,
): Project {
  const clip = p.segments.find((s) => s.id === id);
  const bounds = clipTrimBounds(p, id);
  if (!clip || !bounds || !Number.isFinite(delta) || delta === 0) return p;
  const value = Math.max(
    side === "start" ? bounds.startMin : bounds.endMin,
    Math.min(
      side === "start" ? bounds.startMax : bounds.endMax,
      clip[side] + delta * clip.speed,
    ),
  );
  if (value === clip[side]) return p;
  const next = { ...clip, [side]: value };
  return { ...p, segments: p.segments.map((s) => (s.id === id ? next : s)) };
}
