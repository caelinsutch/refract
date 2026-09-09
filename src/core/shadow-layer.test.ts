import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { defaults } from "./project";
import { drawOrdinaryShadow } from "./shadow-layer";

test("ordinary shadow cache survives intensity and zoom changes but follows geometry edits", () => {
  const c = createCanvas(600, 400).getContext("2d");
  const surfaces: unknown[] = [];
  const context = new Proxy(c, {
    set(target, key, value) {
      return Reflect.set(target, key, value, target);
    },
    get(target, key) {
      if (key === "drawImage")
        return (...args: Parameters<typeof c.drawImage>) => {
          surfaces.push(args[0]);
          return target.drawImage(...args);
        };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as unknown as CanvasRenderingContext2D;
  const appearance = { ...defaults, shadow: 0.25 };
  drawOrdinaryShadow(context, appearance, 100, 100, 200, 100, 12, 1);
  appearance.shadow = 0.75;
  drawOrdinaryShadow(context, appearance, 100, 100, 200, 100, 12, 1);
  drawOrdinaryShadow(context, appearance, 0, 0, 400, 200, 24, 2);
  assert.equal(surfaces[0], surfaces[1]);
  assert.equal(surfaces[1], surfaces[2]);
  appearance.shadowDistance = 50;
  drawOrdinaryShadow(context, appearance, 100, 100, 200, 100, 12, 1);
  assert.notEqual(surfaces[2], surfaces[3]);
  appearance.shadow = 0;
  drawOrdinaryShadow(context, appearance, 100, 100, 200, 100, 12, 1);
  assert.equal(surfaces.length, 4);
});

test("ordinary shadow intensity blends linearly without changing its footprint", () => {
  const c = createCanvas(400, 400).getContext("2d");
  const context = c as unknown as CanvasRenderingContext2D;
  const appearance = {
    ...defaults,
    shadow: 0.25,
    shadowBlur: 5,
    shadowDistance: 10,
  };
  const sample = () => {
    c.clearRect(0, 0, 400, 400);
    drawOrdinaryShadow(context, appearance, 100, 100, 200, 100, 0, 1);
    return c.getImageData(200, 210, 1, 1).data[3];
  };
  const quarter = sample();
  appearance.shadow = 0.5;
  const half = sample();
  assert.ok(quarter > 0);
  assert.ok(Math.abs(half - 2 * quarter) <= 1);
});
