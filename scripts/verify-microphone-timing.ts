import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { alignMicrophoneArgs } from "../desktop/microphone-audio.cjs";
const source = path.resolve(process.argv[2] ?? "work/short-audio/delayed.mov");
const out = path.resolve("work/short-audio/aligned.wav");
execFileSync("/opt/homebrew/bin/ffmpeg", alignMicrophoneArgs(source, out));
const pcm = execFileSync("/opt/homebrew/bin/ffmpeg", [
  "-v",
  "error",
  "-i",
  out,
  "-ac",
  "1",
  "-f",
  "f32le",
  "pipe:1",
]);
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
const onset = samples.findIndex((x) => Math.abs(x) > 0.01) / 48000;
assert.ok(Math.abs(onset - 0.6) < 0.002, `onset=${onset}`);
assert.ok(samples.length / 48000 >= 1, "lost trailing audio");
assert.ok(
  samples.slice(0, Math.floor(0.59 * 48000)).every((x) => Math.abs(x) < 0.001),
);
console.log({
  onset,
  duration: samples.length / 48000,
  bytes: readFileSync(out).length,
});
