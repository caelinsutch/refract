import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject, zoomAt } from "./project";
import { snapAutoTarget } from "./edge-snap";
function fixture() {
  const p = createProject({
    file: "test",
    width: 400,
    height: 200,
    duration: 3000,
    hasAudio: false,
  });
  p.appearance.animation = "instant";
  p.zooms = [
    {
      id: "z",
      start: 0,
      end: 3000,
      scale: 2,
      x: 0.2,
      y: 0.8,
      mode: "auto",
      disabled: false,
    },
  ];
  p.cursor = [{ time: 0, x: 0.2, y: 0.8 }];
  return p;
}
test("automatic edge bands reach corners while zero snapping retains recorded positions", () => {
  const p = fixture();
  assert.deepEqual(snapAutoTarget(p, { x: 0.2, y: 0.8 }, 2, 0.25), {
    x: 0,
    y: 1,
  });
  assert.deepEqual(snapAutoTarget(p, { x: 0.2, y: 0.8 }, 2, 0), {
    x: 0.2,
    y: 0.8,
  });
  assert.equal(zoomAt(p, 1000).x, 0);
  assert.equal(zoomAt(p, 1000).y, 1);
  p.zooms = [{ ...p.zooms[0], mode: "manual" }];
  assert.equal(zoomAt(p, 1000).x, 0.2);
  assert.equal(zoomAt(p, 1000).y, 0.8);
});
test("edge snapping keeps crop-local corners in source coordinates and bounds portrait targets", () => {
  const p = fixture();
  p.crop = { x: 100, y: 50, width: 200, height: 100 };
  assert.deepEqual(snapAutoTarget(p, { x: 0.3, y: 0.7 }, 2, 0.25), {
    x: 0.25,
    y: 0.75,
  });
  p.appearance.ratio = "1:2";
  const point = snapAutoTarget(p, { x: 0.5, y: 0.5 }, 8, 0.45);
  assert(point.x > 0.49 && point.x < 0.51);
  assert(point.y > 0.49 && point.y < 0.51);
});
test("per-zoom snap values survive serialization and reject invalid project data", () => {
  const p = fixture();
  p.zooms[0].snapToEdgesRatio = 0.4;
  assert.equal(
    validateProject(JSON.parse(JSON.stringify(p))).zooms[0].snapToEdgesRatio,
    0.4,
  );
  for (const value of [-0.1, 0.5, "25"]) {
    const bad = JSON.parse(JSON.stringify(p));
    bad.zooms[0].snapToEdgesRatio = value;
    assert.throws(() => validateProject(bad), /invalid zoom/);
  }
});
