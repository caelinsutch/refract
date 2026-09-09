import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject, zoomAt } from "./project";
import { initialZoomScale } from "./framing";
import { videoGeometry } from "./compositor";
import { autoZoomTargets } from "./auto-zoom";
function fixture() {
  const p = createProject({
    file: "test",
    width: 400,
    height: 200,
    duration: 5000,
    hasAudio: false,
  });
  p.appearance.ratio = "1:2";
  p.appearance.padding = 0;
  p.appearance.animation = "instant";
  p.zooms = [
    {
      id: "z",
      start: 1000,
      end: 3000,
      scale: 1,
      x: 0.5,
      y: 0.5,
      mode: "manual",
      disabled: false,
    },
  ];
  return p;
}
test("portrait zoom starts from fill scale while the neutral frame remains fitted", () => {
  const p = fixture();
  assert.equal(initialZoomScale(p), 4);
  assert.equal(zoomAt(p, 0).scale, 1);
  assert.equal(zoomAt(p, 1500).scale, 4);
  assert.equal(zoomAt(p, 3500).scale, 1);
  const neutral = videoGeometry(p, 0, 200, 400),
    zoomed = videoGeometry(p, 1500, 200, 400);
  assert.equal(neutral.h, 100);
  assert.equal(zoomed.h, 400);
  assert.equal(zoomed.y, 0);
  assert.equal(zoomed.x, -300);
});
test("horizontal padded zoom retains its baseline while zero padding fills mismatched aspect", () => {
  const p = fixture();
  p.appearance.ratio = "4:3";
  p.appearance.padding = 10;
  assert.equal(initialZoomScale(p), 1);
  p.appearance.padding = 0;
  assert.equal(initialZoomScale(p), 1.5);
  p.appearance.ratio = "Auto";
  assert.equal(initialZoomScale(p), 1);
});
test("fill scale changes invalidate existing motion checkpoints and auto tracking allowances", () => {
  const p = fixture();
  assert.equal(zoomAt(p, 1500).scale, 4);
  p.appearance.ratio = "Auto";
  assert.equal(zoomAt(p, 1500).scale, 1);
  p.cursor = [
    { time: 1100, x: 0.3, y: 0.4 },
    { time: 1500, x: 0.5, y: 0.4 },
  ];
  assert.equal(autoZoomTargets(p, p.zooms[0]).length, 1);
  p.appearance.ratio = "1:2";
  assert.equal(autoZoomTargets(p, p.zooms[0]).length, 2);
});
test("fill factor is included in spring evolution without a discontinuity at zoom boundaries", () => {
  const p = fixture();
  p.appearance.animation = "smooth";
  for (const boundary of [1000, 3000])
    assert(
      Math.abs(
        zoomAt(p, boundary - 0.001).scale - zoomAt(p, boundary + 0.001).scale,
      ) < 0.0001,
    );
  const expected = zoomAt(p, 1800);
  zoomAt(p, 4500);
  zoomAt(p, 0);
  assert.deepEqual(zoomAt(p, 1800), expected);
});
