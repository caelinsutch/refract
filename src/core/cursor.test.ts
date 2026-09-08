import { test } from "node:test";
import assert from "node:assert/strict";
import { cursorAt, recentClicks } from "./cursor";
import { createProject, validateProject } from "./project";
const events = [
  { time: 100, x: 0.1, y: 0.2, click: true },
  { time: 200, x: 0.9, y: 0.8, click: false },
  { time: 200, x: 0.7, y: 0.6, click: true },
  { time: 400, x: 0.3, y: 0.4, click: true },
];
test("cursor sampling is bounded, deterministic after seeking, and resolves duplicate times", () => {
  assert.equal(cursorAt([], 0, true), null);
  assert.deepEqual(cursorAt(events, 0, true), { x: 0.1, y: 0.2 });
  assert.deepEqual(cursorAt(events, 900, true), { x: 0.3, y: 0.4 });
  assert.deepEqual(cursorAt(events, 200, true), { x: 0.7, y: 0.6 });
  assert.deepEqual(cursorAt(events, 150, false), { x: 0.1, y: 0.2 });
  assert.deepEqual(cursorAt(events, 150, true), { x: 0.5, y: 0.5 });
  assert.deepEqual(recentClicks(events, 400, 200), [events[3]]);
  assert.deepEqual(recentClicks(events, 199, 200), [events[0]]);
});
test("loaded cursor tracks are ordered and invalid coordinates rejected", () => {
  const p = createProject({
    file: "test",
    width: 100,
    height: 100,
    duration: 1000,
    hasAudio: false,
  });
  p.cursor = [events[3], events[0]];
  assert.deepEqual(validateProject(p).cursor, [events[0], events[3]]);
  p.cursor = [{ ...events[0], x: NaN }];
  assert.throws(() => validateProject(p), /invalid cursor/);
});

test("cursor spring presets retain momentum and give deterministic seek results", async () => {
  const { animatedCursorAt } = await import("./cursor");
  const track = [
    { time: 0, x: 0.2, y: 0.2, click: false },
    { time: 100, x: 0.8, y: 0.8, click: false },
    { time: 250, x: 0.4, y: 0.6, click: false },
  ];
  for (const style of ["smooth", "medium", "rapid"] as const) {
    const before = animatedCursorAt(track, 249.999, style)!;
    const after = animatedCursorAt(track, 250.001, style)!;
    assert.ok(
      Math.abs(before.x - after.x) < 0.0001,
      "retarget must preserve position continuity",
    );
    const expected = animatedCursorAt(track, 350, style);
    animatedCursorAt(track, 5000, style);
    animatedCursorAt(track, 0, style);
    assert.deepEqual(animatedCursorAt(track, 350, style), expected);
    // An extra sample at the same target must not change spring evolution.
    const subdivided = [track[0], { ...track[0], time: 50 }, ...track.slice(1)];
    assert.deepEqual(animatedCursorAt(subdivided, 350, style), expected);
    const settled = animatedCursorAt(track, 5000, style)!;
    assert.ok(Math.abs(settled.x - 0.4) < 0.00001);
    assert.ok(Math.abs(settled.y - 0.6) < 0.00001);
  }
  assert.ok(
    animatedCursorAt(track, 200, "rapid")!.x >
      animatedCursorAt(track, 200, "smooth")!.x,
  );
  assert.deepEqual(animatedCursorAt(track, 100, "none"), { x: 0.8, y: 0.8 });
});
