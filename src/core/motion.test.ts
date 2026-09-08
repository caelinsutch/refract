import test from "node:test";
import assert from "node:assert/strict";
import { followClicks, smootherstep } from "./motion";
test("zoom easing has smooth endpoints and remains bounded", () => {
  assert.equal(smootherstep(0), 0);
  assert.equal(smootherstep(1), 1);
  assert.ok(smootherstep(0.001) < 1e-7);
  assert.ok(1 - smootherstep(0.999) < 1e-7);
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const value = smootherstep(i / 100);
    assert.ok(value >= previous && value <= 1);
    previous = value;
  }
});
test("rapid click retargeting keeps the panning position continuous", () => {
  const clicks = [
    { time: 0, x: 0, y: 0 },
    { time: 100, x: 1, y: 1 },
    { time: 200, x: 0, y: 1 },
  ];
  const before = followClicks(clicks, 199.999, 350),
    after = followClicks(clicks, 200, 350);
  assert.ok(Math.abs(after.x - before.x) < 0.00001);
  assert.ok(Math.abs(after.y - before.y) < 0.00001);
  assert.deepEqual(followClicks(clicks, 600, 350), { x: 0, y: 1 });
  assert.deepEqual(followClicks(clicks, 200, 0), { x: 0, y: 1 });
});
