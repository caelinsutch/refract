import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject } from "../src/core/project";
import { exportArgs } from "../src/core/export";
const directory = resolve("work/clip-audio");
mkdirSync(directory, { recursive: true });
const ffmpeg = process.env.REFRACT_FFMPEG ?? "/opt/homebrew/bin/ffmpeg";
function run(args: string[], input?: Buffer) {
  const result = spawnSync(ffmpeg, args, {
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw result.error ?? Error(result.stderr.toString());
  return result.stdout;
}
const source = resolve(directory, "tone.wav"),
  output = resolve(directory, "clip-gains.mp4");
run([
  "-v",
  "error",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=1000:sample_rate=48000:duration=6",
  source,
]);
const p = createProject({
  file: source,
  width: 64,
  height: 36,
  duration: 6000,
  hasAudio: true,
});
p.segments = [
  { id: "full", start: 0, end: 1000, speed: 1 },
  { id: "half-fast", start: 2000, end: 4000, speed: 2, volume: 0.5 },
  { id: "silent", start: 4000, end: 5000, speed: 1, muted: true },
  { id: "quarter", start: 5000, end: 6000, speed: 1, volume: 0.25 },
];
const canvas = createCanvas(64, 36);
canvas.getContext("2d").fillRect(0, 0, 64, 36);
run(
  exportArgs(p, source, output, 30, "mp4"),
  Buffer.concat(
    Array.from({ length: 120 }, () => canvas.toBuffer("image/png")),
  ),
);
const pcm = run([
  "-v",
  "error",
  "-i",
  output,
  "-vn",
  "-ac",
  "1",
  "-ar",
  "48000",
  "-f",
  "f32le",
  "pipe:1",
]);
const rms = (second: number) => {
  let sum = 0,
    count = 0;
  for (
    let sample = Math.floor((second + 0.25) * 48000);
    sample < Math.floor((second + 0.75) * 48000);
    sample++
  ) {
    const value = pcm.readFloatLE(sample * 4);
    sum += value * value;
    count++;
  }
  return Math.sqrt(sum / count);
};
const levels = [0, 1, 2, 3].map(rms),
  ratios = levels.map((v) => v / levels[0]);
assert.ok(
  Math.abs(ratios[1] - 0.5) < 0.02,
  `Half-speed-clip gain: ${ratios[1]}`,
);
assert.ok(ratios[2] < 0.001, `Muted clip level: ${ratios[2]}`);
assert.ok(Math.abs(ratios[3] - 0.25) < 0.02, `Quarter gain: ${ratios[3]}`);
const report = {
  output,
  levels,
  ratios,
  decodedAudioSeconds: pcm.length / 4 / 48000,
};
writeFileSync(
  resolve(directory, "result.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
