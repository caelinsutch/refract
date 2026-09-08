export function smootherstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
/** Retarget from the in-flight position rather than jumping to the preceding click. */
export function followClicks(
  clicks: { time: number; x: number; y: number }[],
  time: number,
  transition: number,
) {
  let from = { x: clicks[0].x, y: clicks[0].y },
    to = from,
    start = clicks[0].time;
  const at = (t: number) => {
    const f = transition ? smootherstep((t - start) / transition) : 1;
    return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
  };
  for (let i = 1; i < clicks.length && clicks[i].time <= time; i++) {
    from = at(clicks[i].time);
    to = clicks[i];
    start = clicks[i].time;
  }
  return at(time);
}
