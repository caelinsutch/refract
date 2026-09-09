import { BackgroundFilter } from "./background-filter";
import { blurShadowAlpha } from "./shadow-blur";
import { createRenderSurface } from "./cursor-render";
import type { Appearance } from "./project";

export function supportsDirectionalShadow(width: number, height: number) {
  return width <= 5000 && height <= 5000;
}

export function shadowKernels(blur: number): number[] {
  const quality = Math.max(1, Math.round(blur * 0.625));
  return Array.from(
    { length: quality },
    (_, i) => blur * (1 - i / quality) + 0.5,
  );
}
const cache = new WeakMap<
  CanvasRenderingContext2D,
  {
    key: string;
    surface: ReturnType<typeof createRenderSurface>;
    padding: number;
  }
>();
let filter: BackgroundFilter | undefined;

/** Frame shadows are cached at unit scale, then transformed with the screen. */
export function drawFrameShadow(
  c: CanvasRenderingContext2D,
  a: Appearance,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  scale: number,
  directional = a.shadowDirectional,
) {
  if (!(a.shadow > 0) || !(scale > 0)) return;
  const baseWidth = width / scale,
    baseHeight = height / scale;
  const baseRadius = radius / scale;
  const blur = Math.max(0, Math.min(30, a.shadowBlur));
  const distance = a.shadowDistance;
  // Stable precision avoids reallocating because of floating-point zoom roundoff.
  const key = [
    baseWidth,
    baseHeight,
    baseRadius,
    blur,
    distance,
    a.shadowAngle,
    Number(directional),
  ]
    .map((value) => value.toFixed(4))
    .join(":");
  let cached = cache.get(c);
  if (!cached || cached.key !== key) {
    const padding = Math.ceil(Math.abs(distance) + blur * 9);
    const factor = directional ? 2 : 1;
    const sw = Math.ceil(baseWidth * factor + padding * 2),
      sh = Math.ceil(baseHeight * factor + padding * 2);
    const input = createRenderSurface(c, sw, sh);
    const context = input.getContext("2d") as CanvasRenderingContext2D;
    const radians = (a.shadowAngle * Math.PI) / 180;
    context.translate(
      Math.cos(radians) * distance,
      Math.sin(radians) * distance,
    );
    if (directional) {
      context.beginPath();
      context.moveTo(padding, padding + baseHeight);
      context.lineTo(padding + baseWidth, padding + baseHeight * 2);
      context.lineTo(padding + baseWidth * 2, padding + baseHeight);
      context.lineTo(padding + baseWidth, padding);
      context.closePath();
      context.clip();
    }
    context.fillStyle = "black";
    context.beginPath();
    context.roundRect(
      padding,
      padding,
      baseWidth * factor,
      baseHeight * factor,
      Math.max(0, Math.min(baseRadius, baseWidth / 2, baseHeight / 2)),
    );
    context.fill();
    const surface = createRenderSurface(c, sw, sh);
    const output = surface.getContext("2d") as CanvasRenderingContext2D;
    const kernels = shadowKernels(blur);
    let blurred: OffscreenCanvas | null = null;
    if (typeof OffscreenCanvas !== "undefined") {
      try {
        filter ??= new BackgroundFilter();
        blurred = filter.render(input, 0, kernels);
      } catch {
        /* Use the same sampling passes in software when GPU access fails. */
      }
    }
    if (blurred) output.drawImage(blurred, 0, 0);
    else {
      const pixels = context.getImageData(0, 0, sw, sh);
      blurShadowAlpha(pixels.data, sw, sh, kernels);
      output.putImageData(pixels, 0, 0);
    }
    cached = { key, surface, padding };
    cache.set(c, cached);
  }
  c.save();
  c.globalAlpha *= a.shadow;
  c.drawImage(
    cached.surface,
    x - cached.padding * scale,
    y - cached.padding * scale,
    cached.surface.width * scale,
    cached.surface.height * scale,
  );
  c.restore();
}
