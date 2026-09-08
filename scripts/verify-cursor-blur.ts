import { createCanvas, loadImage } from "@napi-rs/canvas";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { drawCursorExposure } from "../src/core/cursor-render";
import { createProject } from "../src/core/project";
import { drawFrame } from "../src/core/compositor";
import { exportArgs } from "../src/core/export";
import { writeEncoderFrame } from "../src/core/export-process";
const run = promisify(execFile),
  dir = path.resolve("work/cursor-blur");
await fs.mkdir(dir, { recursive: true });
const canvas = createCanvas(3840, 2160),
  c = canvas.getContext("2d");
const points = Array.from({ length: 12 }, (_, i) => ({
  x: 1000 + i * 5,
  y: 700 + i * 2,
}));
for (let i = 0; i < 50; i++)
  drawCursorExposure(c as unknown as CanvasRenderingContext2D, points, 4.5);
const started = performance.now();
for (let i = 0; i < 500; i++)
  drawCursorExposure(c as unknown as CanvasRenderingContext2D, points, 4.5);
const millisecondsPerPass = (performance.now() - started) / 500;
console.log(
  JSON.stringify({ nativeCanvasMillisecondsPerPass: millisecondsPerPass }),
);
if (process.argv.includes("--benchmark-only")) process.exit(0);
const p = createProject({
  file: "unused",
  width: 320,
  height: 180,
  duration: 1000,
  hasAudio: false,
});
Object.assign(p.appearance, {
  cursorMotionBlur: 1,
  cursorSmooth: false,
  cursorIdleMs: null,
  cursorLoopMs: null,
});
p.cursor = Array.from({ length: 201 }, (_, i) => ({
  time: i * 5,
  x: 0.1 + i * 0.004,
  y: 0.5,
}));
const output = createCanvas(1280, 720),
  ctx = output.getContext("2d"),
  source = createCanvas(320, 180),
  sc = source.getContext("2d");
sc.fillStyle = "#58729c";
sc.fillRect(0, 0, 320, 180);
sc.fillStyle = "#ced6e3";
sc.fillRect(40, 30, 240, 120);
const file = path.join(dir, "cursor-blur.mp4");
const child = spawn(
  "/opt/homebrew/bin/ffmpeg",
  exportArgs(p, "unused", file, 30, "mp4"),
);
let errors = "";
child.stderr.on("data", (d) => (errors += d));
child.stdin.on("error", () => {});
const done = new Promise<void>((resolve, reject) => {
  child.on("error", reject);
  child.on("close", (code) => (code === 0 ? resolve() : reject(Error(errors))));
});
done.catch(() => {});
let reference!: Buffer;
try {
  for (let i = 0; i < 30; i++) {
    drawFrame(
      ctx as unknown as CanvasRenderingContext2D,
      source as unknown as CanvasImageSource,
      p,
      (i * 1000) / 30,
      1280,
      720,
    );
    if (i === 15)
      reference = Buffer.from(ctx.getImageData(0, 0, 1280, 720).data);
    await writeEncoderFrame(child, output.toBuffer("image/png"));
  }
  child.stdin.end();
  await done;
} finally {
  if (child.exitCode === null) child.kill("SIGKILL");
}
const decoded = path.join(dir, "decoded.png");
await run("/opt/homebrew/bin/ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  file,
  "-vf",
  "select=eq(n\\,15)",
  "-frames:v",
  "1",
  decoded,
]);
ctx.drawImage(await loadImage(decoded), 0, 0);
const actual = ctx.getImageData(0, 0, 1280, 720).data;
let error = 0;
for (let i = 0; i < actual.length; i++)
  if (i % 4 !== 3) error += Math.abs(actual[i] - reference[i]);
const mean = error / (1280 * 720 * 3);
assert.ok(mean < 4, `Decoded frame differs: ${mean}`);
p.appearance.cursorMotionBlur = 0;
drawFrame(
  ctx as unknown as CanvasRenderingContext2D,
  source as unknown as CanvasImageSource,
  p,
  500,
  1280,
  720,
);
const sharp = ctx.getImageData(0, 0, 1280, 720).data;
let blurRegionError = 0,
  sharpRegionError = 0;
for (let y = 350; y < 410; y++)
  for (let x = 600; x < 680; x++)
    for (let channel = 0; channel < 3; channel++) {
      const i = (y * 1280 + x) * 4 + channel;
      blurRegionError += Math.abs(actual[i] - reference[i]);
      sharpRegionError += Math.abs(actual[i] - sharp[i]);
    }
assert.ok(
  blurRegionError < sharpRegionError,
  "Decoded cursor must match the blurred reference more closely than the sharp alternative",
);
console.log(
  JSON.stringify({
    blurRegionMeanError: blurRegionError / (80 * 60 * 3),
    sharpRegionMeanError: sharpRegionError / (80 * 60 * 3),
  }),
);
const { stdout } = await run("/opt/homebrew/bin/ffprobe", [
  "-v",
  "error",
  "-count_frames",
  "-show_streams",
  "-of",
  "json",
  file,
]);
const stream = JSON.parse(stdout).streams[0];
assert.equal(stream.nb_read_frames, "30");
assert.equal(stream.width, 1280);
assert.equal(stream.height, 720);
console.log(JSON.stringify({ frames: 30, meanRgbError: mean, output: file }));
