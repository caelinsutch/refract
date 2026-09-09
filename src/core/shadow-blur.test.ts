import { test } from "node:test";
import assert from "node:assert/strict";
import { blurShadowAlpha } from "./shadow-blur";

test("a half-pixel diagonal pass preserves fractional samples until the final average", () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  pixels[(2 * 5 + 2) * 4 + 3] = 255;
  blurShadowAlpha(pixels, 5, 5, [0.5]);
  const rows = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => pixels[(y * 5 + x) * 4 + 3]),
  );
  assert.deepEqual(rows, [
    [0, 0, 0, 0, 0],
    [0, 16, 32, 16, 0],
    [0, 32, 64, 32, 0],
    [0, 16, 32, 16, 0],
    [0, 0, 0, 0, 0],
  ]);
});

test("shadow passes use transparent UV boundaries and keep RGB black", () => {
  const pixels = new Uint8ClampedArray(4 * 3 * 4).fill(255);
  blurShadowAlpha(pixels, 4, 3, [1]);
  assert.equal(pixels[3], 64);
  assert.equal(pixels[(1 * 4 + 1) * 4 + 3], 255);
  assert.ok(pixels.every((value, i) => i % 4 === 3 || value === 0));
  blurShadowAlpha(pixels, 4, 3, [10]);
  assert.ok(pixels.every((value) => value === 0));
});

test("half-texel boundaries match float32 shader offsets", () => {
  const pixels = new Uint8ClampedArray(32 * 32 * 4).fill(255);
  const exact = new Uint8ClampedArray(pixels);
  blurShadowAlpha(exact, 32, 32, [10.5]);
  blurShadowAlpha(pixels, 32, 32, [10.500000000000002]);
  assert.deepEqual(pixels, exact);
});
