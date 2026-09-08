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

export type CursorStyle = "smooth" | "medium" | "rapid" | "none";
const presets = {
  smooth: { stiffness: 470, damping: 70, mass: 3 },
  medium: { stiffness: 340, damping: 60, mass: 3 },
  rapid: { stiffness: 530, damping: 40, mass: 1 },
};
type State = { x: number; y: number; vx: number; vy: number };
const tracks = new WeakMap<
  CursorEvent[],
  Map<Exclude<CursorStyle, "none">, State[]>
>();

/** Exact damped spring evolution against a fixed target, in seconds. */
function evolve(
  position: number,
  velocity: number,
  target: number,
  seconds: number,
  style: Exclude<CursorStyle, "none">,
) {
  const { stiffness, damping, mass } = presets[style];
  const a = damping / (2 * mass),
    w2 = stiffness / mass;
  const w = Math.sqrt(w2 - a * a);
  const displacement = position - target;
  const b = (velocity + a * displacement) / w;
  const c = Math.cos(w * seconds),
    s = Math.sin(w * seconds),
    decay = Math.exp(-a * seconds);
  return [
    target + decay * (displacement * c + b * s),
    decay * ((-a * displacement + b * w) * c + (-a * b - displacement * w) * s),
  ];
}
function advance(
  state: State,
  target: CursorEvent,
  ms: number,
  style: Exclude<CursorStyle, "none">,
): State {
  const [x, vx] = evolve(state.x, state.vx, target.x, ms / 1000, style);
  const [y, vy] = evolve(state.y, state.vy, target.y, ms / 1000, style);
  return { x, y, vx, vy };
}

/** Precompute spring checkpoints once, then seek in logarithmic time. */
export function animatedCursorAt(
  events: CursorEvent[],
  time: number,
  style: CursorStyle,
) {
  if (style === "none") return cursorAt(events, time, false);
  if (!events.length) return null;
  let styles = tracks.get(events);
  if (!styles) {
    styles = new Map();
    tracks.set(events, styles);
  }
  let states = styles.get(style);
  if (!states) {
    states = [{ x: events[0].x, y: events[0].y, vx: 0, vy: 0 }];
    for (let i = 1; i < events.length; i++)
      states.push(
        advance(
          states[i - 1],
          events[i - 1],
          events[i].time - events[i - 1].time,
          style,
        ),
      );
    styles.set(style, states);
  }
  const index = Math.max(0, after(events, time) - 1);
  const state = advance(
    states[index],
    events[index],
    Math.max(0, time - events[index].time),
    style,
  );
  return {
    x: Math.max(0, Math.min(1, state.x)),
    y: Math.max(0, Math.min(1, state.y)),
  };
}
