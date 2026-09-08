import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject, validateProject, type Appearance } from "./project";
import { drawFrame } from "./compositor";

const project = () => {
  const p = createProject({
    file: "fixture",
    width: 400,
    height: 400,
    duration: 2000,
    hasAudio: false,
  });
  Object.assign(p.appearance, {
    padding: 0,
    radius: 0,
    shadow: 0,
    cursorSmooth: false,
    cursorIdleMs: null,
    cursorLoopMs: null,
  });
  p.cursor = [
    { time: 0, x: 0.5, y: 0.5 },
    { time: 500, x: 0.5, y: 0.5, click: true },
  ];
  return p;
};
test("legacy click effects migrate and invalid modes are rejected", () => {
  for (const [old, expected] of [
    [false, "none"],
    [true, "ripple"],
  ] as const) {
    const p = JSON.parse(JSON.stringify(project()));
    p.appearance.clickEffect = old;
    assert.equal(validateProject(p).appearance.clickEffect, expected);
  }
  const p = JSON.parse(JSON.stringify(project()));
  p.appearance.clickEffect = "invalid";
  assert.throws(() => validateProject(p), /click effect/);
  delete p.appearance.clickEffect;
  assert.equal(validateProject(p).appearance.clickEffect, "none");
});
test("circle and ripple remain distinct, seek deterministic, and expire on the source clock", () => {
  const p = project(),
    source = createCanvas(400, 400),
    canvas = createCanvas(400, 400);
  source.getContext("2d").fillRect(0, 0, 400, 400);
  const c = canvas.getContext("2d");
  const frame = (mode: Appearance["clickEffect"], time: number) => {
    p.appearance.clickEffect = mode;
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      time,
      400,
      400,
    );
    return Buffer.from(c.getImageData(0, 0, 400, 400).data);
  };
  const none = frame("none", 600),
    circle = frame("circle", 600),
    ripple = frame("ripple", 600);
  assert.notDeepEqual(circle, none);
  assert.notDeepEqual(ripple, none);
  assert.notDeepEqual(circle, ripple);
  assert.deepEqual(frame("circle", 1200), frame("none", 1200));
  assert.deepEqual(
    frame("circle", 600),
    circle,
    "Backward seeking restores identical pixels",
  );
  p.segments[0].speed = 2;
  assert.deepEqual(
    frame("circle", 300),
    circle,
    "Edited time maps to the same click at double speed",
  );
  p.appearance.hideCursor = true;
  assert.deepEqual(frame("circle", 300), frame("none", 300));
});
