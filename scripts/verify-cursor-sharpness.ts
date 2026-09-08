import { createCanvas } from "@napi-rs/canvas";
import { createProject } from "../src/core/project";
import { drawFrame } from "../src/core/compositor";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const p = createProject({
  file: "white",
  width: 1280,
  height: 720,
  duration: 1000,
  hasAudio: false,
});
p.cursor = [{ time: 0, x: 0.5, y: 0.5 }];
Object.assign(p.appearance, {
  padding: 0,
  radius: 0,
  shadow: 0,
  cursorSize: 1.5,
  cursorSmooth: false,
});
const source = createCanvas(1280, 720);
source.getContext("2d").fillStyle = "white";
source.getContext("2d").fillRect(0, 0, 1280, 720);
const low = createCanvas(1280, 720);
drawFrame(low.getContext("2d") as any, source as any, p, 0, 1280, 720);
const old = createCanvas(3200, 1800);
old.getContext("2d").drawImage(low, 0, 0, 3200, 1800);
const sharp = createCanvas(3200, 1800);
drawFrame(sharp.getContext("2d") as any, source as any, p, 0, 3200, 1800);
function transitionPixels(canvas: typeof sharp) {
  const data = canvas.getContext("2d").getImageData(1590, 890, 110, 125).data;
  let count = 0;
  for (let i = 0; i < data.length; i += 4)
    if (data[i] > 32 && data[i] < 230) count++;
  return count;
}
const before = transitionPixels(old),
  after = transitionPixels(sharp);
assert.ok(after < before * 0.65, `${before} -> ${after}`);
await fs.mkdir("work/cursor-sharpness", { recursive: true });
await fs.writeFile(
  "work/cursor-sharpness/native.png",
  sharp.toBuffer("image/png"),
);
await fs.writeFile(
  "work/cursor-sharpness/upsampled.png",
  old.toBuffer("image/png"),
);
console.log(
  JSON.stringify({
    intermediateEdgePixelsBefore: before,
    intermediateEdgePixelsAfter: after,
  }),
);
