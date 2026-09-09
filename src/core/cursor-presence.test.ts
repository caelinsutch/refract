import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import {
  animatedCursorAt,
  loopedCursorAt,
  cursorPresentAt,
  cursorVisibleAt,
} from "./cursor";
import { createProject, validateProject } from "./project";
import { recordedProject } from "./recording";
import { drawFrame } from "./compositor";
const track = [
  { time: 0, x: 0, y: 0, visible: false },
  { time: 100, x: 0.2, y: 0.3, visible: true },
  { time: 500, x: 0.2, y: 0.3, visible: false },
  { time: 1000, x: 0.8, y: 0.7, visible: true },
];
const source = {
  file: "test",
  width: 400,
  height: 400,
  duration: 2000,
  hasAudio: false,
};
test("capture visibility respects exact boundaries and resets spring and idle on re-entry", () => {
  for (const t of [999, 100, 500, 0, 1000, 499]) {
    const expected = (t >= 100 && t < 500) || t >= 1000;
    assert.equal(cursorPresentAt(track, t), expected);
    assert.equal(cursorVisibleAt(track, t, null), expected);
  }
  assert.deepEqual(animatedCursorAt(track, 1000, "smooth"), { x: 0.8, y: 0.7 });
  assert.equal(cursorVisibleAt(track, 1000, 500), true);
  assert.equal(cursorVisibleAt(track, 1500, 500), false);
  assert.deepEqual(loopedCursorAt(track, 2000, 0, 2000, 1000, "none"), {
    x: 0.2,
    y: 0.3,
  });
  assert.equal(cursorPresentAt([{ time: 100, x: 0.5, y: 0.5 }], 0), true);
});
test("saved projects preserve presence and reject invalid visibility", () => {
  const p = recordedProject(source, track, "Presence");
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(p))).cursor,
    track,
  );
  const invalid = JSON.parse(JSON.stringify(p));
  invalid.cursor[0].visible = "false";
  assert.throws(() => validateProject(invalid), /cursor data/);
});
test("hidden source intervals render no pointer even with looping, blur, and edited time", () => {
  const p = createProject(source);
  p.cursor = track;
  p.segments = [{ id: "cut", start: 400, end: 1400, speed: 2 }];
  Object.assign(p.appearance, {
    cursorIdleMs: null,
    cursorLoopMs: 1000,
    motionBlurAmount: 1,
    cursorMotionBlur: 1,
  });
  const input = createCanvas(400, 400),
    canvas = createCanvas(400, 400);
  input.getContext("2d").fillRect(0, 0, 400, 400);
  const render = (time: number) => {
    drawFrame(
      canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      input as unknown as CanvasImageSource,
      p,
      time,
      400,
      400,
    );
    return Buffer.from(
      canvas.getContext("2d").getImageData(0, 0, 400, 400).data,
    );
  };
  for (const time of [100, 299, 50]) {
    p.appearance.hideCursor = false;
    const hidden = render(time);
    p.appearance.hideCursor = true;
    assert.deepEqual(hidden, render(time));
  }
  p.appearance.hideCursor = false;
  const visible = render(300);
  p.appearance.hideCursor = true;
  assert.notDeepEqual(visible, render(300));
});
