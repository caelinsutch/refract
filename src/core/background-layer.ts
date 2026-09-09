import { BackgroundFilter } from "./background-filter";
import { createRenderSurface } from "./cursor-render";

type Surface = ReturnType<typeof createRenderSurface>;
const cache = new WeakMap<
  CanvasRenderingContext2D,
  {
    key: string;
    image: CanvasImageSource | undefined;
    result: Surface;
  }
>();
let filter: BackgroundFilter | undefined;

/** Gaussian fallback with the repeated kernel's variance, including interpolation. */
function fallbackSigma(strength: number) {
  const spacing = strength / 20;
  const weights = [0.153388, 0.221461, 0.250301, 0.221461, 0.153388];
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    const sample = (i - 2) * spacing;
    const lower = Math.floor(sample);
    const fraction = sample - lower;
    variance +=
      weights[i] * ((1 - fraction) * lower ** 2 + fraction * (lower + 1) ** 2);
  }
  return Math.sqrt((20 * variance) / weights.reduce((a, b) => a + b, 0));
}

/** Cache only the background; timeline, recording, cursor, and camera stay live. */
export function drawBackgroundLayer(
  c: CanvasRenderingContext2D,
  width: number,
  height: number,
  setting: number,
  key: string,
  image: CanvasImageSource | undefined,
  paint: (context: CanvasRenderingContext2D) => void,
) {
  if (!(setting > 0)) {
    paint(c);
    return;
  }
  const strength = (width * Math.min(100, setting)) / 2000;
  const id = `${width}:${height}:${strength}:${key}`;
  let entry = cache.get(c);
  if (!entry || entry.key !== id || entry.image !== image) {
    const padding = Math.ceil(strength * 2);
    const input = createRenderSurface(
      c,
      width + padding * 2,
      height + padding * 2,
    );
    const context = input.getContext("2d") as CanvasRenderingContext2D;
    context.translate(padding, padding);
    paint(context);
    let blurred: OffscreenCanvas | null = null;
    if (typeof OffscreenCanvas !== "undefined") {
      try {
        filter ??= new BackgroundFilter();
        blurred = filter.render(input, strength);
      } catch {
        // Canvas fallback also serves machines where GPU filtering is unavailable.
        blurred = null;
      }
    }
    const result = createRenderSurface(c, width, height);
    const output = result.getContext("2d") as CanvasRenderingContext2D;
    if (blurred) output.drawImage(blurred, -padding, -padding);
    else {
      output.filter = `blur(${fallbackSigma(strength)}px)`;
      output.drawImage(input, -padding, -padding);
      output.filter = "none";
    }
    entry = { key: id, image, result };
    cache.set(c, entry);
  }
  c.drawImage(entry.result, 0, 0);
}
