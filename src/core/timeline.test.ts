import test from "node:test";
import assert from "node:assert/strict";
import { createProject, type Zoom } from "./project";
import { visibleRange, dragZoomRange } from "./timeline";
const fixture = () => {
  const p = createProject({
    file: "test",
    duration: 12000,
    width: 1280,
    height: 720,
    hasAudio: false,
  });
  p.segments = [
    { id: "a", start: 0, end: 4000, speed: 1 },
    { id: "b", start: 8000, end: 12000, speed: 2 },
  ];
  return p;
};
const zoom = (start: number, end: number): Zoom => ({
  id: "z",
  start,
  end,
  scale: 2,
  x: 0.5,
  y: 0.5,
  mode: "manual",
  disabled: false,
});
test("a zoom with a trimmed endpoint remains visible for its surviving footage", () => {
  const p = fixture();
  assert.deepEqual(visibleRange(p, zoom(6000, 10000)), {
    start: 4000,
    end: 5000,
  });
  assert.deepEqual(visibleRange(p, zoom(2000, 6000)), {
    start: 2000,
    end: 4000,
  });
  assert.equal(visibleRange(p, zoom(4500, 7500)), null);
});
test("drag distance follows output time on a double-speed clip", () => {
  const p = fixture(),
    z = zoom(8500, 9500);
  const next = dragZoomRange(p, z, "move", 500);
  assert.equal(next.start, 9500);
  assert.equal(next.end, 10500);
  assert.equal(dragZoomRange(p, z, "end", 500).end, 10500);
});
test("moving across a cut preserves visible duration and chooses the correct boundary", () => {
  const p = fixture();
  const moved = dragZoomRange(p, zoom(2000, 3000), "move", 2000);
  assert.equal(moved.start, 8000);
  assert.equal(moved.end, 10000);
  const endingAtCut = dragZoomRange(p, zoom(2000, 3000), "end", 1000);
  assert.equal(endingAtCut.end, 4000);
  assert.deepEqual(visibleRange(p, moved), { start: 4000, end: 5000 });
});
test("dragging beyond the timeline clamps the whole interval", () => {
  const p = fixture();
  const moved = dragZoomRange(p, zoom(8500, 9500), "move", 10000);
  assert.deepEqual(visibleRange(p, moved), { start: 5500, end: 6000 });
});
