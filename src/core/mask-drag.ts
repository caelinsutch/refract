import type { Mask, Project } from "./project";
import { videoGeometry } from "./compositor";
export function moveMask(
  p: Project,
  mask: Mask,
  time: number,
  width: number,
  height: number,
  dx: number,
  dy: number,
): Mask {
  if (dx === 0 && dy === 0) return mask;
  const g = videoGeometry(p, time, width, height);
  return {
    ...mask,
    x: Math.max(
      0,
      Math.min(1 - mask.width, mask.x + ((dx / g.w) * g.cw) / p.source.width),
    ),
    y: Math.max(
      0,
      Math.min(1 - mask.height, mask.y + ((dy / g.h) * g.ch) / p.source.height),
    ),
  };
}
