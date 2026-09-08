import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject, splitAt, validateProject } from "./project";
import { drawFrame } from "./compositor";

test("clip cursor hiding follows edited boundaries and hides click effects", () => {
  const p = createProject({
    file: "test",
    width: 400,
    height: 400,
    duration: 4000,
    hasAudio: false,
  });
  p.segments = [
    { id: "a", start: 0, end: 1000, speed: 1 },
    { id: "b", start: 2000, end: 4000, speed: 2, hideCursor: true },
  ];
  p.cursor = [
    { time: 0, x: 0.5, y: 0.5 },
    { time: 2000, x: 0.5, y: 0.5, click: true },
  ];
  Object.assign(p.appearance, {
    padding: 0,
    radius: 0,
    shadow: 0,
    cursorSmooth: false,
    cursorIdleMs: null,
    cursorLoopMs: 1000,
    clickEffect: "circle",
  });
  const src = createCanvas(400, 400),
    canvas = createCanvas(400, 400),
    c = canvas.getContext("2d");
  src.getContext("2d").fillRect(0, 0, 400, 400);
  const frame = (time: number) => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      src as unknown as CanvasImageSource,
      p,
      time,
      400,
      400,
    );
    return Buffer.from(c.getImageData(0, 0, 400, 400).data);
  };
  const visible = frame(999),
    hidden = frame(1000);
  assert.notDeepEqual(visible, hidden);
  assert.deepEqual(
    frame(1100),
    hidden,
    "No click feedback leaks into hidden clip",
  );
  assert.deepEqual(
    frame(1990),
    hidden,
    "Cursor loop does not override clip hiding",
  );
  p.appearance.hideCursor = true;
  assert.deepEqual(frame(999), hidden, "Global hiding applies to every clip");
  p.appearance.hideCursor = false;
  assert.deepEqual(
    frame(999),
    visible,
    "Backward seeking restores visible clip",
  );
});
test("splitting preserves per-clip cursor settings and invalid values are rejected", () => {
  const p = createProject({
    file: "test",
    width: 400,
    height: 400,
    duration: 4000,
    hasAudio: false,
  });
  p.segments[0].hideCursor = true;
  const split = splitAt(p, 2000);
  assert.equal(split.segments.length, 2);
  assert.ok(split.segments.every((s) => s.hideCursor));
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(split))).segments,
    split.segments,
  );
  const invalid = JSON.parse(JSON.stringify(split));
  invalid.segments[0].hideCursor = "true";
  assert.throws(() => validateProject(invalid), /clip range/);
});
