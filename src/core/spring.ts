export type SpringConfig = { stiffness: number; damping: number; mass: number };

/** Analytic damped-spring motion, preserving velocity when the target changes. */
export function springState(
  position: number,
  velocity: number,
  target: number,
  seconds: number,
  config: SpringConfig,
): [number, number] {
  const { stiffness, damping, mass } = config;
  const a = damping / (2 * mass),
    w2 = stiffness / mass;
  const displacement = position - target;
  const discriminant = w2 - a * a;
  if (Math.abs(discriminant) <= 1e-10 * Math.max(w2, a * a)) {
    const b = velocity + a * displacement,
      decay = Math.exp(-a * seconds);
    return [
      target + decay * (displacement + b * seconds),
      decay * (b - a * (displacement + b * seconds)),
    ];
  }
  if (discriminant < 0) {
    const root = Math.sqrt(-discriminant);
    const r1 = -w2 / (a + root),
      r2 = -a - root;
    const c1 = (velocity - r2 * displacement) / (r1 - r2),
      c2 = displacement - c1;
    const e1 = Math.exp(r1 * seconds),
      e2 = Math.exp(r2 * seconds);
    return [target + c1 * e1 + c2 * e2, c1 * r1 * e1 + c2 * r2 * e2];
  }
  const w = Math.sqrt(discriminant),
    b = (velocity + a * displacement) / w;
  const c = Math.cos(w * seconds),
    s = Math.sin(w * seconds),
    decay = Math.exp(-a * seconds);
  return [
    target + decay * (displacement * c + b * s),
    decay * ((-a * displacement + b * w) * c + (-a * b - displacement * w) * s),
  ];
}
