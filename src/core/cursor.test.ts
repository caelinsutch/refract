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
