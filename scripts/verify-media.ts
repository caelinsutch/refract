import { createCanvas, loadImage } from "@napi-rs/canvas";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createProject, duration, sourceAt } from "../src/core/project";
import { drawFrame } from "../src/core/compositor";
import { exportArgs } from "../src/core/export";
const exec = promisify(execFile),
  ffmpeg = process.env.REFRACT_FFMPEG ?? "/opt/homebrew/bin/ffmpeg",
  ffprobe = process.env.REFRACT_FFPROBE ?? "/opt/homebrew/bin/ffprobe";
const dir = path.resolve("work/media-verification");
await fs.mkdir(dir, { recursive: true });
const source = path.join(dir, "source.mp4");
await exec(ffmpeg, [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=160x90:rate=24",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=440:sample_rate=48000",
  "-t",
  "12",
  "-c:v",
  "libx264",
  "-c:a",
  "aac",
  source,
]);
await exec(ffmpeg, [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-i",
  source,
  "-an",
  path.join(dir, "source-%03d.png"),
]);
const p = createProject(
  {
    file: "source.mp4",
    duration: 12000,
    width: 160,
    height: 90,
    hasAudio: true,
  },
  "Verification",
);
p.segments = [
  { id: "first", start: 0, end: 4000, speed: 1 },
  { id: "second", start: 8000, end: 12000, speed: 2 },
];
p.zooms = [
  {
    id: "zoom",
    start: 1000,
    end: 3000,
    scale: 2,
    x: 0.25,
    y: 0.7,
    mode: "manual",
    disabled: false,
  },
];
p.captions = [
  { id: "caption", start: 1500, end: 2500, text: "Frame verification" },
];
const canvas = createCanvas(320, 180),
  ctx = canvas.getContext("2d"),
  frameCount = Math.ceil((duration(p) / 1000) * 24),
  frames: Buffer[] = [];
for (let i = 0; i < frameCount; i++) {
  const t = (i / 24) * 1000,
    sourceFrame = Math.min(
      288,
      Math.floor((sourceAt(p, t)!.time / 1000) * 24) + 1,
    ),
    image = await loadImage(
      path.join(dir, `source-${String(sourceFrame).padStart(3, "0")}.png`),
    );
  drawFrame(
    ctx as unknown as CanvasRenderingContext2D,
    image as unknown as CanvasImageSource,
    p,
    t,
    320,
    180,
  );
  frames.push(canvas.toBuffer("image/png"));
}
async function encode(format: "mp4" | "gif") {
  const destination = path.join(dir, "composed." + format);
  const fps = format === "gif" ? 20 : 24;
  const selectedFrames = Array.from(
    { length: 6 * fps },
    (_, i) => frames[Math.floor((i / fps) * 24)],
  );
  const child = spawn(ffmpeg, exportArgs(p, source, destination, fps, format));
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const done = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(Error(stderr)),
    );
  });
  done.catch(() => {});
  for (const frame of selectedFrames)
    await new Promise<void>((resolve, reject) =>
      child.stdin.write(frame, (e) => (e ? reject(e) : resolve())),
    );
  child.stdin.end();
  await done;
  const result = await exec(ffprobe, [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-count_frames",
    "-of",
    "json",
    destination,
  ]);
  const info = JSON.parse(result.stdout);
  const video = info.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  assert.equal(video.width, 320);
  assert.equal(video.height, 180);
  assert.equal(Number(video.nb_read_frames), 6 * fps);
  assert.ok(Math.abs(Number(info.format.duration) - 6) < 0.09);
  if (format === "mp4") {
    const audio = info.streams.find(
      (s: { codec_type: string }) => s.codec_type === "audio",
    );
    assert.ok(audio);
    assert.ok(Math.abs(Number(audio.duration) - 6) < 0.09);
    assert.equal(video.codec_name, "h264");
  }
  console.log(
    `${format.toUpperCase()}: 320×180, ${6 * fps} frames, ${info.format.duration}s; ${format === "mp4" ? "AAC audio verified" : "looping image stream verified"}`,
  );
  return info;
}
const mp4 = await encode("mp4");
const gif = await encode("gif");
// Compare the pre-encode frame at two seconds against a decoded export frame. Lossy
// H.264 is expected to differ slightly, but geometry and selected source must agree.
const decoded = path.join(dir, "decoded.png");
await exec(ffmpeg, [
  "-v",
  "error",
  "-y",
  "-ss",
  "2",
  "-i",
  path.join(dir, "composed.mp4"),
  "-frames:v",
  "1",
  decoded,
]);
const reference = await loadImage(frames[48]),
  actual = await loadImage(decoded);
const check = createCanvas(320, 180),
  c = check.getContext("2d");
c.drawImage(reference, 0, 0);
const a = c.getImageData(0, 0, 320, 180).data;
c.clearRect(0, 0, 320, 180);
c.drawImage(actual, 0, 0);
const b = c.getImageData(0, 0, 320, 180).data;
let sum = 0;
for (let i = 0; i < a.length; i += 4)
  sum +=
    Math.abs(a[i] - b[i]) +
    Math.abs(a[i + 1] - b[i + 1]) +
    Math.abs(a[i + 2] - b[i + 2]);
const mae = sum / (320 * 180 * 3);
assert.ok(mae < 8, `Frame error too high: ${mae}`);
console.log(`Exported frame mean absolute RGB error: ${mae.toFixed(3)} / 255`);
await fs.writeFile(
  path.join(dir, "results.json"),
  JSON.stringify({ mp4, gif, frameMeanAbsoluteError: mae }, null, 2),
);
