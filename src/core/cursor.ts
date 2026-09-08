import { springState, type SpringConfig } from "./spring.js";
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

const activityTracks = new WeakMap<CursorEvent[], number[]>();
/** Repeated position samples do not restart the idle clock. Clicks reveal the pointer. */
export function cursorVisibleAt(
  events: CursorEvent[],
  time: number,
  idleMs: number | null,
) {
  if (!events.length) return false;
  if (idleMs == null) return true;
  let activity = activityTracks.get(events);
  if (!activity) {
    let last = events[0].time;
    activity = events.map((event, i) => {
      const previous = events[Math.max(0, i - 1)];
      if (event.click || event.x !== previous.x || event.y !== previous.y)
        last = event.time;
      return last;
    });
    activityTracks.set(events, activity);
  }
  return time - activity[Math.max(0, after(events, time) - 1)] < idleMs;
}

export type CursorStyle = "smooth" | "medium" | "rapid" | "none";
/** Return toward the first retained source position over the final source-time interval. */
export function loopedCursorAt(
  events: CursorEvent[],
  time: number,
  start: number,
  end: number,
  loopMs: number | null,
  style: CursorStyle,
  custom?: SpringConfig,
) {
  const current = animatedCursorAt(events, time, style, custom);
  if (!current || loopMs == null || end <= start) return current;
  const begins = Math.max(start, end - loopMs);
  if (time <= begins) return current;
  const from = animatedCursorAt(events, begins, style, custom)!;
  const to = animatedCursorAt(events, start, style, custom)!;
  if (time >= end) return to;
  const progress = Math.max(0, Math.min(1, (time - begins) / (end - begins)));
  const blend = progress * progress * (3 - 2 * progress);
  return {
    x: from.x + (to.x - from.x) * blend,
    y: from.y + (to.y - from.y) * blend,
  };
}
export const cursorPresets = {
  smooth: { stiffness: 470, damping: 70, mass: 3 },
  medium: { stiffness: 340, damping: 60, mass: 3 },
  rapid: { stiffness: 530, damping: 40, mass: 1 },
};
type State = { x: number; y: number; vx: number; vy: number };
const tracks = new WeakMap<CursorEvent[], Map<string, State[]>>();

function advance(
  state: State,
  target: CursorEvent,
  ms: number,
  config: SpringConfig,
): State {
  const [x, vx] = springState(state.x, state.vx, target.x, ms / 1000, config);
  const [y, vy] = springState(state.y, state.vy, target.y, ms / 1000, config);
  return { x, y, vx, vy };
}

/** Precompute spring checkpoints once, then seek in logarithmic time. */
export function animatedCursorAt(
  events: CursorEvent[],
  time: number,
  style: CursorStyle,
  custom?: SpringConfig,
) {
  if (style === "none") return cursorAt(events, time, false);
  if (!events.length) return null;
  const config = custom ?? cursorPresets[style];
  const key = `${config.stiffness}/${config.damping}/${config.mass}`;
  let styles = tracks.get(events);
  if (!styles) {
    styles = new Map();
    tracks.set(events, styles);
  }
  let states = styles.get(key);
  if (!states) {
    states = [{ x: events[0].x, y: events[0].y, vx: 0, vy: 0 }];
    for (let i = 1; i < events.length; i++)
      states.push(
        advance(
          states[i - 1],
          events[i - 1],
          events[i].time - events[i - 1].time,
          config,
        ),
      );
    if (styles.size >= 8) styles.delete(styles.keys().next().value!);
    styles.set(key, states);
  }
  const index = Math.max(0, after(events, time) - 1);
  const state = advance(
    states[index],
    events[index],
    Math.max(0, time - events[index].time),
    config,
  );
  return {
    x: Math.max(0, Math.min(1, state.x)),
    y: Math.max(0, Math.min(1, state.y)),
  };
}
