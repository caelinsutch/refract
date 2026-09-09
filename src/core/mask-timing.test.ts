import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject, type Mask } from "./project";
import { drawFrame } from "./compositor";
const mask = (id: string, start: number, end: number): Mask => ({
  id,
  start,
  end,
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  type: "highlight",
  strength: 50,
});
function fixture() {
  const p = createProject({
    file: "fixture",
    width: 64,
    height: 64,
    duration: 4000,
    hasAudio: false,
  });
  Object.assign(p.appearance, { padding: 0, radius: 0, shadow: 0 });
  const video = createCanvas(64, 64),
    canvas = createCanvas(64, 64);
  video.getContext("2d").fillRect(0, 0, 64, 64);
  const c = canvas.getContext("2d");
  const frame = (time: number) => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      video as unknown as CanvasImageSource,
      p,
      time,
      64,
      64,
    );
    return Buffer.from(c.getImageData(0, 0, 64, 64).data);
  };
  return { p, frame };
}
test("adjacent masks do not double-apply on their shared boundary", () => {
  const { p, frame } = fixture();
  p.masks = [mask("a", 0, 1000), mask("b", 1000, 2000)];
  const before = frame(999),
    boundary = frame(1000);
  assert.deepEqual(boundary, before);
  const after = frame(2000);
  p.masks = [];
  assert.deepEqual(after, frame(2000));
  assert.notDeepEqual(boundary, after);
});
test("mask endpoints follow retained source time through cuts and speed changes", () => {
  const { p, frame } = fixture();
  p.segments = [
    { id: "a", start: 0, end: 1000, speed: 1 },
    { id: "b", start: 2000, end: 4000, speed: 2 },
  ];
  p.masks = [mask("a", 0, 2000)];
  const visible = frame(999),
    cut = frame(1000);
  p.masks = [];
  assert.deepEqual(cut, frame(1000));
  assert.notDeepEqual(visible, cut);
  p.masks = [mask("b", 2000, 3000)];
  assert.notDeepEqual(frame(1499), cut);
  assert.deepEqual(frame(1500), cut);
  assert.notDeepEqual(
    frame(1200),
    cut,
    "backward seeking must restore the mask",
  );
});
