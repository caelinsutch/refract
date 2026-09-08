import type { Project } from "./project.js";
import { springState, type SpringConfig } from "./spring.js";
export const screenPresets = {
  focused: { stiffness: 200, damping: 40, mass: 2.25 },
  smooth: { stiffness: 170, damping: 50, mass: 3 },
};
type Target = { scale: number; x: number; y: number };
type Checkpoint = {
  time: number;
  target: Target;
  position: Target;
  velocity: Target;
};
const neutral = (): Target => ({ scale: 1, x: 0.5, y: 0.5 });
const cache = new WeakMap<
  Project,
  {
    zooms: Project["zooms"];
    cursor: Project["cursor"];
    key: string;
    checkpoints: Checkpoint[];
  }
>();
function advance(
  point: Checkpoint,
  time: number,
  config: SpringConfig,
): Checkpoint {
  const position = { ...point.position },
    velocity = { ...point.velocity };
  for (const key of ["scale", "x", "y"] as const) {
    [position[key], velocity[key]] = springState(
      position[key],
      velocity[key],
      point.target[key],
      Math.max(0, time - point.time) / 1000,
      config,
    );
  }
  return { time, position, velocity, target: point.target };
}

/** Spring checkpoints make zoom boundaries and retargets independent of playback order. */
export function screenMotionAt(p: Project, time: number): Target {
  const config =
    p.appearance.screenSpring ??
    screenPresets[p.appearance.animation === "smooth" ? "smooth" : "focused"];
  const key = `${p.appearance.animation}/${config.stiffness}/${config.damping}/${config.mass}`;
  let entry = cache.get(p);
  if (
    !entry ||
    entry.zooms !== p.zooms ||
    entry.cursor !== p.cursor ||
    entry.key !== key
  ) {
    const zooms = p.zooms
      .filter((z) => !z.disabled)
      .map((z) => ({
        z,
        clicks:
          z.mode === "auto"
            ? p.cursor.filter(
                (c) => c.click && c.time >= z.start && c.time <= z.end,
              )
            : [],
      }));
    const times = new Set<number>([0]);
    for (const { z, clicks } of zooms) {
      times.add(z.start);
      times.add(z.end);
      for (const c of clicks) times.add(c.time);
    }
    const orderedTimes = [...times].sort((a, b) => a - b);
    let point: Checkpoint = {
      time: orderedTimes[0],
      target: neutral(),
      position: neutral(),
      velocity: { scale: 0, x: 0, y: 0 },
    };
    const checkpoints: Checkpoint[] = [];
    for (const t of orderedTimes) {
      point = advance(point, t, config);
      const active = zooms.find(
        ({ z, clicks }) =>
          t >= z.start &&
          t < z.end &&
          (z.mode === "manual" || clicks.length > 0),
      );
      let target = neutral();
      if (active) {
        const { z, clicks } = active;
        const click = clicks.findLast((c) => c.time <= t) ?? clicks[0];
        target = { scale: z.scale, x: click?.x ?? z.x, y: click?.y ?? z.y };
      }
      point = { ...point, target };
      checkpoints.push(point);
    }
    entry = { zooms: p.zooms, cursor: p.cursor, key, checkpoints };
    cache.set(p, entry);
  }
  let lo = 0,
    hi = entry.checkpoints.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (entry.checkpoints[mid].time <= time) lo = mid + 1;
    else hi = mid;
  }
  const point = entry.checkpoints[Math.max(0, lo - 1)];
  const value =
    p.appearance.animation === "instant"
      ? point.target
      : advance(point, time, config).position;
  const scale = Math.max(1, Math.min(8, value.scale)),
    limit = 0.5 / scale;
  return {
    scale,
    x: Math.max(limit, Math.min(1 - limit, value.x)),
    y: Math.max(limit, Math.min(1 - limit, value.y)),
  };
}
