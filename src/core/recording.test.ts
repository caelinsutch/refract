import test from "node:test";
import assert from "node:assert/strict";
import { recordedProject } from "./recording";
import { validateProject } from "./project";
test("completed capture has a serializable project with cursor-driven zooms", () => {
  const p = recordedProject(
    {
      file: "media/screen.mp4",
      width: 1280,
      height: 720,
      duration: 5000,
      hasAudio: true,
    },
    [
      { time: 4000, x: 1.2, y: -0.1, click: true },
      { time: 1000, x: 0.5, y: 0.5, click: true },
      { time: 1200, x: 0.6, y: 0.5, click: true },
      { time: NaN, x: 0, y: 0 },
    ],
    "Capture",
  );
  const restored = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.source.file, "media/screen.mp4");
  assert.equal(restored.cursor.length, 3);
  assert.equal(restored.zooms.length, 2);
  assert.equal(restored.zooms[0].start, 700);
  assert.equal(restored.zooms[1].end, 5000);
  assert.equal(restored.cursor[2].x, 1);
  assert.equal(restored.cursor[2].y, 0);
});
test("disabling automatic zooms retains recorded cursor and shortcuts", () => {
  const p = recordedProject(
    {
      file: "media/screen.mp4",
      width: 1280,
      height: 720,
      duration: 5000,
      hasAudio: false,
    },
    [{ time: 1000, x: 0.5, y: 0.5, click: true }],
    "Without automatic zooms",
    [{ time: 1500, key: "C", modifiers: ["command"] }],
    { automaticZooms: false },
  );
  const restored = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.zooms.length, 0);
  assert.equal(restored.cursor.length, 1);
  assert.equal(restored.cursor[0].click, true);
  assert.equal(restored.shortcuts?.length, 1);
});
