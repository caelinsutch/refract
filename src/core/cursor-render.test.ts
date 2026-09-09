import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject, validateProject } from "./project";
import { cursorExposure, drawCursorExposure } from "./cursor-render";
import { drawFrame } from "./compositor";
const fixture = () =>
  createProject({
    file: "unused",
    duration: 2000,
    width: 400,
    height: 400,
    hasAudio: false,
  });
test("cursor exposure stays in the active cut and respects clip speed", () => {
  const p = fixture();
  p.appearance.motionBlurAmount = 1;
  p.appearance.cursorMotionBlur = 1;
  p.segments = [
    { id: "a", start: 0, end: 100, speed: 1 },
    { id: "b", start: 1000, end: 1500, speed: 2 },
  ];
  assert.ok(cursorExposure(p, 100).every((t) => t === 1000));
  const times = cursorExposure(p, 120);
  assert.equal(times.at(-1), 1040);
  assert.ok(Math.abs(times[0] - (1040 - 1000 / 30)) < 1e-8);
  p.appearance.cursorMotionBlur = 0;
  assert.deepEqual(cursorExposure(p, 120), [1040]);
  for (const value of [-1, 2, NaN]) {
    p.appearance.cursorMotionBlur = value;
    assert.throws(() => validateProject(p), /motion blur/);
  }
});
test("motion exposure preserves stationary sharpness and averages alpha before composition", () => {
  const render = (points: { x: number; y: number }[]) => {
    const canvas = createCanvas(120, 80);
    drawCursorExposure(
      canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      points,
      1,
    );
    return canvas.getContext("2d").getImageData(0, 0, 120, 80).data;
  };
  assert.deepEqual(
    render([{ x: 20, y: 20 }]),
    render(Array.from({ length: 12 }, () => ({ x: 20, y: 20 }))),
  );
  const moving = render([
    { x: 20, y: 20 },
    { x: 70, y: 20 },
  ]);
  assert.ok(
    moving[(30 * 120 + 23) * 4 + 3] > 100 &&
      moving[(30 * 120 + 23) * 4 + 3] < 150,
  );
  assert.ok(
    moving[(30 * 120 + 73) * 4 + 3] > 100 &&
      moving[(30 * 120 + 73) * 4 + 3] < 150,
  );
  assert.equal(moving[(30 * 120 + 55) * 4 + 3], 0);
});
test("shared cursor blur is deterministic and absent at a clip boundary", () => {
  const p = fixture();
  Object.assign(p.appearance, {
    padding: 0,
    radius: 0,
    shadow: 0,
    cursorSmooth: false,
    cursorIdleMs: null,
    cursorLoopMs: null,
  });
  p.cursor = Array.from({ length: 21 }, (_, i) => ({
    time: i * 5,
    x: 0.1 + i * 0.04,
    y: 0.5,
  }));
  const source = createCanvas(400, 400);
  source.getContext("2d").fillRect(0, 0, 400, 400);
  const output = createCanvas(400, 400),
    ctx = output.getContext("2d");
  const render = (t: number) => {
    drawFrame(
      ctx as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      t,
      400,
      400,
    );
    return Buffer.from(ctx.getImageData(0, 0, 400, 400).data);
  };
  const sharp = render(90),
    start = render(0);
  p.appearance.motionBlurAmount = 1;
  p.appearance.cursorMotionBlur = 1;
  const blurred = render(90);
  assert.notDeepEqual(blurred, sharp);
  assert.deepEqual(render(0), start);
  render(1500);
  assert.deepEqual(render(90), blurred);
});
