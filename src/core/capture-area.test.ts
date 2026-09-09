import test from "node:test";
import assert from "node:assert/strict";
import { captureAreaBetween } from "./capture-area";
test("capture area is independent of drag direction and stays inside the display", () => {
  const a = { x: 100, y: 200 },
    b = { x: 700, y: 600 };
  assert.deepEqual(captureAreaBetween(a, b, 800, 800), {
    x: 100,
    y: 200,
    width: 600,
    height: 400,
  });
  assert.deepEqual(
    captureAreaBetween(b, a, 800, 800),
    captureAreaBetween(a, b, 800, 800),
  );
  assert.deepEqual(captureAreaBetween(a, { x: 900, y: -20 }, 800, 800), {
    x: 100,
    y: 0,
    width: 700,
    height: 200,
  });
  assert.deepEqual(
    captureAreaBetween({ x: -10, y: -20 }, { x: 900, y: 900 }, 800, 800),
    { x: 0, y: 0, width: 800, height: 800 },
  );
});
test("capture area preserves exact release coordinates and zero-size clicks", () => {
  const start = { x: 20, y: 30 };
  assert.deepEqual(captureAreaBetween(start, start, 800, 800), {
    x: 20,
    y: 30,
    width: 0,
    height: 0,
  });
  assert.deepEqual(captureAreaBetween(start, { x: 52, y: 62 }, 800, 800), {
    x: 20,
    y: 30,
    width: 32,
    height: 32,
  });
  assert.equal(
    captureAreaBetween(start, { x: 51.9, y: 62 }, 800, 800).width,
    31.9,
  );
});
