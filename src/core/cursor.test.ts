import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cursorAt,
  recentClicks,
  cursorVisibleAt,
  loopedCursorAt,
} from "./cursor";
import { createProject, validateProject } from "./project";
const events = [
  { time: 100, x: 0.1, y: 0.2, click: true },
  { time: 200, x: 0.9, y: 0.8, click: false },
  { time: 200, x: 0.7, y: 0.6, click: true },
  { time: 400, x: 0.3, y: 0.4, click: true },
];
test("cursor loop returns to the first retained position with deterministic boundaries", () => {
  const track = [
    { time: 0, x: 0, y: 0 },
    { time: 1000, x: 0.2, y: 0.3 },
    { time: 2500, x: 0.8, y: 0.9 },
    { time: 3900, x: 1, y: 1 },
  ];
  const at = (time: number) =>
    loopedCursorAt(track, time, 1000, 4000, 1000, "none");
  assert.deepEqual(at(4000), {
    x: 0.2,
    y: 0.3,
  });
  assert.deepEqual(at(3000), { x: 0.8, y: 0.9 });
  assert.ok(Math.abs(at(3500)!.x - 0.5) < 1e-9);
  assert.deepEqual(at(4500), at(4000));
  assert.ok(Math.abs(at(3000.001)!.x - at(3000)!.x) < 1e-6);
  assert.deepEqual(loopedCursorAt(track, 2000, 1000, 2000, 4000, "none"), { x: 0.2, y: 0.3 });
  assert.deepEqual(loopedCursorAt(track, 4000, 1000, 4000, null, "none"), {
    x: 1,
    y: 1,
  });
  assert.equal(loopedCursorAt([], 0, 0, 1000, 1000, "smooth"), null);
});
test("idle cursor ignores repeated samples and reveals on movement or click after arbitrary seeks", () => {
  const track = [
    { time: 0, x: 0.5, y: 0.5 },
    { time: 900, x: 0.5, y: 0.5 },
    { time: 1100, x: 0.5, y: 0.5 },
    { time: 1400, x: 0.5, y: 0.5, click: true },
    { time: 2500, x: 0.6, y: 0.5 },
  ];
  for (const [time, expected] of [
    [1100, false],
    [0, true],
    [1400, true],
    [2400, false],
    [2500, true],
    [999, true],
    [1000, false],
  ] as const)
    assert.equal(cursorVisibleAt(track, time, 1000), expected);
  assert.equal(cursorVisibleAt(track, 100000, null), true);
  assert.equal(cursorVisibleAt([], 0, null), false);
});
test("cursor idle delay persists, rejects invalid values, and defaults off for older projects", () => {
  const p = createProject({
    file: "screen.mp4",
    width: 1280,
    height: 720,
    duration: 4000,
    hasAudio: false,
  });
  p.appearance.cursorIdleMs = 1500;
  assert.equal(
    validateProject(JSON.parse(JSON.stringify(p))).appearance.cursorIdleMs,
    1500,
  );
  const legacy = JSON.parse(JSON.stringify(p));
  delete legacy.appearance.cursorIdleMs;
  assert.equal(validateProject(legacy).appearance.cursorIdleMs, null);
  for (const value of [-1, 0, 499, 5001, Infinity]) {
    p.appearance.cursorIdleMs = value;
    assert.throws(() => validateProject(structuredClone(p)), /idle delay/);
  }
});
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
