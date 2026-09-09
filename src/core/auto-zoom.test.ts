import { test } from "node:test";
import assert from "node:assert/strict";
import { autoZoomTargets } from "./auto-zoom";
import { createProject, zoomAt, type Zoom } from "./project";
const zoom: Zoom = {
  id: "auto",
  snapToEdgesRatio: 0,
  start: 1000,
  end: 4000,
  scale: 2,
  x: 0.5,
  y: 0.5,
  mode: "auto",
  disabled: false,
};
function fixture() {
  const p = createProject({
    file: "test",
    width: 1000,
    height: 500,
    duration: 5000,
    hasAudio: false,
  });
  p.zooms = [{ ...zoom }];
  return p;
}
test("movement-only samples form stable spatial groups and activate automatic zoom", () => {
  const p = fixture();
  p.cursor = [
    { time: 1100, x: 0.3, y: 0.4 },
    { time: 1300, x: 0.4, y: 0.5 },
    { time: 2000, x: 0.8, y: 0.6 },
  ];
  assert.deepEqual(autoZoomTargets(p, zoom), [
    { time: 1100, x: 0.35, y: 0.45 },
    { time: 2000, x: 0.8, y: 0.6 },
  ]);
  p.appearance.animation = "instant";
  assert.equal(zoomAt(p, 1500).scale, 2);
  assert.equal(zoomAt(p, 1500).x, 0.35);
});
test("automatic tracking preserves spring continuity and deterministic seeks at group boundaries", () => {
  const p = fixture();
  p.cursor = [
    { time: 1100, x: 0.3, y: 0.4 },
    { time: 2000, x: 0.7, y: 0.6 },
    { time: 3000, x: 0.4, y: 0.3 },
  ];
  const before = zoomAt(p, 1999.999),
    after = zoomAt(p, 2000.001);
  assert(Math.abs(before.x - after.x) < 0.0001);
  const expected = zoomAt(p, 2500);
  zoomAt(p, 4500);
  zoomAt(p, 1100);
  assert.deepEqual(zoomAt(p, 2500), expected);
});
test("empty ranges use surrounding recorded positions but absent cursor data stays neutral", () => {
  const p = fixture();
  p.cursor = [
    { time: 800, x: 0.4, y: 0.5 },
    { time: 4500, x: 0.7, y: 0.5 },
  ];
  assert.deepEqual(autoZoomTargets(p, zoom), [{ time: 1000, x: 0.4, y: 0.5 }]);
  p.cursor = [];
  assert.deepEqual(autoZoomTargets(p, zoom), []);
  assert.equal(zoomAt(p, 2000).scale, 1);
});
test("a smaller source crop reduces the allowed group extent", () => {
  const p = fixture();
  p.cursor = [
    { time: 1100, x: 0.3, y: 0.4 },
    { time: 1300, x: 0.5, y: 0.4 },
  ];
  assert.equal(autoZoomTargets(p, zoom).length, 1);
  p.crop = { x: 0, y: 0, width: 500, height: 250 };
  assert.equal(autoZoomTargets(p, zoom).length, 2);
});
