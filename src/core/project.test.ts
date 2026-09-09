import test from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  duration,
  sourceAt,
  splitAt,
  validateProject,
  zoomAt,
} from "./project";
const fixture = () =>
  createProject({
    file: "test.mp4",
    duration: 12000,
    width: 1280,
    height: 720,
    hasAudio: true,
  });
test("cuts and speed share one output clock", () => {
  const p = fixture();
  p.segments = [
    { id: "a", start: 0, end: 4000, speed: 1 },
    { id: "b", start: 8000, end: 12000, speed: 2 },
  ];
  assert.equal(duration(p), 6000);
  assert.equal(sourceAt(p, 4000)?.time, 8000);
  assert.equal(sourceAt(p, 5000)?.time, 10000);
  assert.equal(sourceAt(p, 6000)?.time, 12000);
});
test("split preserves duration and does not create empty clips", () => {
  const p = fixture();
  assert.equal(splitAt(p, 0), p);
  const q = splitAt(p, 3500);
  assert.equal(q.segments.length, 2);
  assert.equal(duration(q), 12000);
  assert.equal(q.segments[1].start, 3500);
});
test("zoom is deterministic and constrained at screen edges", () => {
  const p = fixture();
  p.zooms = [
    {
      id: "z",
      start: 1000,
      end: 4000,
      scale: 2,
      x: 0,
      y: 1,
      mode: "manual",
      disabled: false,
    },
  ];
  const settled = zoomAt(p, 2000);
  assert.ok(Math.abs(settled.scale - 2) < 0.01);
  assert.ok(settled.x >= 0 && settled.x < 0.01);
  assert.ok(settled.y > 0.99 && settled.y <= 1);
  assert.equal(zoomAt(p, 1000).scale, 1);
  assert.ok(Math.abs(zoomAt(p, 6000).scale - 1) < 0.001);
  assert.deepEqual(zoomAt(p, 2000), zoomAt(p, 2000));
});
test("auto zoom with no clicks does not invent a target", () => {
  const p = fixture();
  p.zooms = [
    {
      id: "z",
      start: 0,
      end: 5000,
      scale: 2,
      x: 0,
      y: 0,
      mode: "auto",
      disabled: false,
    },
  ];
  assert.equal(zoomAt(p, 2500).scale, 1);
});
test("invalid media ranges are rejected before playback", () => {
  const p = fixture();
  p.segments[0].speed = 0;
  assert.throws(() => validateProject(p), /clip range/);
});
