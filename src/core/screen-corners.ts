import type { Appearance } from "./project";

/** Preserve legacy inner-radius projects; new edits describe the outer frame. */
export function screenCorners(
  appearance: Pick<Appearance, "radius" | "outerRadius" | "inset">,
) {
  const { radius, outerRadius, inset } = appearance;
  if (outerRadius === undefined)
    return { inner: radius, outer: radius + inset };
  const inner = Math.max(0, outerRadius - inset);
  return {
    outer: outerRadius,
    inner: inner >= 4 ? inner : outerRadius >= 4 ? 4 : inner,
  };
}

export function insetAppearance(inset: number) {
  return { inset, outerRadius: Math.round(inset + 12) };
}
