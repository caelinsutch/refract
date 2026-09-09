import type { Appearance } from "./project";
export function normalizeInsetBalance(x: number, y: number) {
  const snap = (v: number) =>
    Math.abs(v - 0.5) < 0.01 ? 0.5 : Math.max(0, Math.min(1, v));
  return { x: snap(x), y: snap(y) };
}
export function insetEdges(
  appearance: Pick<Appearance, "inset" | "insetBalance">,
) {
  const { inset, insetBalance = { x: 0.5, y: 0.5 } } = appearance;
  return {
    left: 2 * inset * insetBalance.x,
    right: 2 * inset * (1 - insetBalance.x),
    top: 2 * inset * insetBalance.y,
    bottom: 2 * inset * (1 - insetBalance.y),
  };
}
