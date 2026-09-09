import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createProject } from "../src/core/project";
import { drawFrame, sourcePointAt } from "../src/core/compositor";
const directory = path.resolve("work/screen-body");
mkdirSync(directory, { recursive: true });
const p = createProject({
  file: "fixture",
  width: 1000,
  height: 500,
  duration: 1000,
  hasAudio: false,
});
p.crop = { x: 200, y: 100, width: 400, height: 200 };
Object.assign(p.appearance, {
  padding: 10,
  radius: 0,
  inset: 0,
  shadow: 0,
  hideCursor: true,
  background: "color",
  color: "#0000ff",
  animation: "instant",
});
p.zooms = [
  {
    id: "zoom",
    start: 0,
    end: 1000,
    scale: 2,
    x: 0.5,
    y: 0.4,
    mode: "manual",
    disabled: false,
  },
];
const source = createCanvas(1000, 500),
  sc = source.getContext("2d");
sc.fillStyle = "red";
sc.fillRect(0, 0, 1000, 500);
sc.fillStyle = "lime";
sc.fillRect(390, 165, 20, 20);
const output = createCanvas(1000, 1000);
drawFrame(
  output.getContext("2d") as unknown as CanvasRenderingContext2D,
  source as unknown as CanvasImageSource,
  p,
  500,
  1000,
  1000,
);
const png = path.join(directory, "frame.png"),
  mp4 = path.join(directory, "screen-body.mp4");
writeFileSync(png, output.toBuffer("image/png"));
execFileSync("/opt/homebrew/bin/ffmpeg", [
  "-v",
  "error",
  "-y",
  "-loop",
  "1",
  "-i",
  png,
  "-t",
  "0.2",
  "-r",
  "30",
  "-c:v",
  "libx264",
  "-crf",
  "18",
  "-pix_fmt",
  "yuv420p",
  mp4,
]);
const pixels = execFileSync(
  "/opt/homebrew/bin/ffmpeg",
  [
    "-v",
    "error",
    "-i",
    mp4,
    "-frames:v",
    "1",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "pipe:1",
  ],
  { maxBuffer: 4_000_000 },
);
const pixel = (x: number, y: number) => [
  ...pixels.subarray((y * 1000 + x) * 3, (y * 1000 + x) * 3 + 3),
];
const green = pixel(300, 400),
  red = pixel(700, 150),
  blue = pixel(700, 50);
assert(
  green[1] > 200 && green[0] < 30 && green[2] < 30,
  "Encoded landmark moved away from hit-tested position",
);
assert(
  red[0] > 200 && red[1] < 30 && red[2] < 30,
  "Scaled screen did not occupy expanded vertical extent",
);
assert(
  blue[2] > 200 && blue[0] < 30,
  "Screen escaped its expected body extent",
);
assert.deepEqual(sourcePointAt(p, 500, 1000, 1000, 300, 400), {
  x: 0.4,
  y: 0.35,
});
console.log(
  JSON.stringify({
    encodedLandmark: green,
    expandedBody: red,
    background: blue,
    mp4,
  }),
);
