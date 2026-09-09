import test from "node:test";
import assert from "node:assert/strict";
import { recordedProject } from "./recording";
import { validateProject } from "./project";
test("mouse button transitions survive recording construction and project reopening", () => {
  const p = recordedProject(
    {
      file: "screen.mp4",
      width: 64,
      height: 64,
      duration: 3000,
      hasAudio: false,
    },
    [
      {
        time: 100,
        x: 0.5,
        y: 0.5,
        visible: true,
        click: true,
        button: 1,
        pressed: true,
      },
      {
        time: 200,
        x: 0.5,
        y: 0.5,
        visible: true,
        click: false,
        button: 1,
        pressed: false,
      },
    ],
    "Fixture",
  );
  const reopened = validateProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(reopened.cursor, p.cursor);
  assert.equal(reopened.cursor.filter((e) => e.click).length, 1);
  assert.equal(reopened.zooms.length, 1);
  assert.equal(reopened.cursor[1].pressed, false);
  for (const patch of [
    { button: -1 },
    { button: 1.5 },
    { button: 32 },
    { pressed: "no" },
  ]) {
    const bad = JSON.parse(JSON.stringify(p));
    Object.assign(bad.cursor[0], patch);
    assert.throws(() => validateProject(bad), /cursor data/);
  }
});
