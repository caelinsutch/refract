import type { CursorEvent } from "./project.js";

/** First event strictly after source time. Capture tracks are sorted on creation/load. */
function after(events: CursorEvent[], time: number): number {
  let low = 0,
    high = events.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (events[mid].time <= time) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function cursorAt(events: CursorEvent[], time: number, smooth: boolean) {
  if (!events.length) return null;
  const index = after(events, time);
  const prev = events[Math.max(0, index - 1)];
  const next = events[Math.min(index, events.length - 1)];
  let f =
    smooth && next.time > prev.time
      ? Math.max(0, Math.min(1, (time - prev.time) / (next.time - prev.time)))
      : 0;
  f = f * f * (3 - 2 * f);
  return {
    x: prev.x + (next.x - prev.x) * f,
    y: prev.y + (next.y - prev.y) * f,
  };
}

/** Only inspect the short active click-effect window, rather than the full recording. */
export function recentClicks(
  events: CursorEvent[],
  time: number,
  lifetime: number,
) {
  return events
    .slice(after(events, time - lifetime), after(events, time))
    .filter((e) => e.click);
}
