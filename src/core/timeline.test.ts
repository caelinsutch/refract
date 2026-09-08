import test from "node:test";
import assert from "node:assert/strict";
import { createProject, type Zoom } from "./project";
import { visibleRange, dragZoomRange, createTimelineRange } from "./timeline";
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

test("clip trimming follows speed and cannot overlap adjacent footage", async () => {
  const { trimClip } = await import("./timeline");
  const p = fixture();
  let q = trimClip(p, "b", "start", 500);
  assert.equal(q.segments[1].start, 9000);
  q = trimClip(p, "a", "end", 10000);
  assert.equal(q.segments[0].end, 8000);
  q = trimClip(p, "b", "start", -10000);
  assert.equal(q.segments[1].start, 4000);
  q = trimClip(p, "b", "end", -10000);
  assert.equal(q.segments[1].end, 8100);
  assert.equal(p.segments[1].end, 12000);
});

test("short split clips do not expand on a stationary or inward trim", async () => {
  const { trimClip, clipTrimBounds } = await import("./timeline");
  const p = fixture();
  p.segments = [{ id: "short", start: 500, end: 540, speed: 2 }];
  assert.equal(trimClip(p, "short", "start", 0), p);
  assert.equal(trimClip(p, "short", "start", 10), p);
  assert.equal(trimClip(p, "short", "end", -10), p);
  assert.equal(trimClip(p, "short", "end", NaN), p);
  assert.deepEqual(clipTrimBounds(p, "short"), {
    startMin: 0,
    startMax: 500,
    endMin: 540,
    endMax: 12000,
  });
  assert.equal(trimClip(p, "short", "end", 100).segments[0].end, 740);
});

test("timeline creation maps reverse drags, cut boundaries, and doubled speed", () => {
  const p = fixture();
  assert.deepEqual(createTimelineRange(p, 3000, 4500), {
    start: 3000,
    end: 9000,
  });
  assert.deepEqual(createTimelineRange(p, 4500, 3000), {
    start: 3000,
    end: 9000,
  });
  assert.deepEqual(createTimelineRange(p, 3000, 4000), {
    start: 3000,
    end: 4000,
  });
  assert.deepEqual(createTimelineRange(p, 4000, 4500), {
    start: 8000,
    end: 9000,
  });
  assert.deepEqual(createTimelineRange(p, -500, 9000), {
    start: 0,
    end: 12000,
  });
  assert.equal(createTimelineRange(p, 500, 501), null);
});
test("mask range gestures retain geometry and follow the edited clock", () => {
  const p = fixture();
  const mask = {
    id: "mask",
    start: 8500,
    end: 9500,
    x: 0.2,
    y: 0.3,
    width: 0.4,
    height: 0.5,
    type: "blur" as const,
    strength: 20,
  };
  const moved = dragZoomRange(p, mask, "move", 500);
  assert.deepEqual(moved, { ...mask, start: 9500, end: 10500 });
  assert.equal(dragZoomRange(p, mask, "end", -10000), mask);
  assert.deepEqual(dragZoomRange(p, mask, "start", -500), {
    ...mask,
    start: 3750,
  });
});
