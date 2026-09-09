import test from "node:test";
import assert from "node:assert/strict";
import { createProject, type CursorEvent } from "./project";
import { clickSoundCues } from "./click-sounds";
const event = (time: number, pressed: boolean, button = 0): CursorEvent => ({
  time,
  pressed,
  button,
  x: 0.5,
  y: 0.5,
  click: pressed,
  visible: true,
});
const project = () =>
  createProject({
    file: "fixture",
    width: 64,
    height: 64,
    duration: 4000,
    hasAudio: false,
  });
test("short presses combine by button while long presses keep down and up cues", () => {
  const p = project();
  p.cursor = [
    event(100, true),
    event(150, true, 1),
    event(200, false),
    event(450, false, 1),
    event(600, true),
    event(850, false),
  ];
  assert.deepEqual(
    clickSoundCues(p).map((c) => [c.time, c.kind, c.button]),
    [
      [100, "click", 0],
      [150, "down", 1],
      [450, "up", 1],
      [600, "down", 0],
      [850, "up", 0],
    ],
  );
});
test("sound cues honor cuts, speed limits, zero boundaries and legacy clicks", () => {
  const p = project();
  p.segments = [
    { id: "a", start: 0, end: 1000, speed: 1 },
    { id: "b", start: 2000, end: 3000, speed: 2 },
    { id: "c", start: 3000, end: 4000, speed: 4 },
  ];
  p.cursor = [
    event(0, true),
    event(50, false),
    event(900, true),
    event(1100, false),
    event(1500, true),
    event(2000, false),
    event(2200, true),
    event(2300, false),
    { time: 2600, x: 0.5, y: 0.5, click: true },
    event(3100, true),
    event(3200, false),
  ];
  assert.deepEqual(
    clickSoundCues(p).map((c) => [c.time, c.sourceTime, c.kind]),
    [
      [900, 900, "down"],
      [1000, 2000, "up"],
      [1100, 2200, "click"],
      [1300, 2600, "click"],
    ],
  );
});
test("sound planning is deterministic and does not mutate cursor metadata", () => {
  const p = project();
  p.cursor = [
    event(200, false),
    event(100, true),
    { ...event(300, true), visible: false },
  ];
  const original = structuredClone(p.cursor);
  const cues = clickSoundCues(p);
  assert.deepEqual(clickSoundCues(p), cues);
  assert.deepEqual(p.cursor, original);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].kind, "click");
});
