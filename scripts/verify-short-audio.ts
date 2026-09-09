import { createCanvas } from "@napi-rs/canvas";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import assert from "node:assert/strict";
import { createProject } from "../src/core/project";
import { exportArgs } from "../src/core/export";
import {
  writeEncoderFrame,
  waitForEncoderFinalization,
} from "../src/core/export-process";
const dir = path.resolve("work/short-audio");
mkdirSync(dir, { recursive: true });
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const audio = path.join(dir, "short.wav");
execFileSync(ffmpeg, [
  "-v",
  "error",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=1320:duration=0.4:sample_rate=48000",
  audio,
]);
const canvas = createCanvas(64, 64);
canvas.getContext("2d").fillRect(0, 0, 64, 64);
const frame = canvas.toBuffer("image/png");
for (const track of ["source", "microphone"] as const) {
  const p = createProject({
    file: "screen.mp4",
    width: 64,
    height: 64,
    duration: 4000,
    hasAudio: track === "source",
  });
  p.segments = [
    { id: "a", start: 0, end: 1000, speed: 1 },
    { id: "b", start: 2000, end: 4000, speed: 2 },
  ];
  if (track === "microphone")
    p.microphoneAudio = { file: "short.wav", volume: 1, muted: false };
  const out = path.join(dir, `${track}.mp4`);
  const child = spawn(
    ffmpeg,
    exportArgs(p, audio, out, 30, "mp4", undefined, audio),
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let errors = "";
  child.stderr.on("data", (d) => (errors += d));
  const done = once(child, "close").then(([code]) =>
    assert.equal(code, 0, errors),
  );
  void done.catch(() => {});
  child.stdin.on("error", () => {});
  for (let i = 0; i < 60; i++) await writeEncoderFrame(child, frame);
  child.stdin.end();
  await waitForEncoderFinalization(child, done, out, 15000);
  const pcm = execFileSync(ffmpeg, [
    "-v",
    "error",
    "-i",
    out,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "48000",
    "-f",
    "f32le",
    "pipe:1",
  ]);
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
  const rms = (start: number) =>
    Math.sqrt(
      samples
        .slice(start * 48000, (start + 0.1) * 48000)
        .reduce((sum, x) => sum + x * x, 0) / 4800,
    );
  assert.ok(
    samples.length >= 96000,
    `${track}: only ${samples.length / 48000}s of audio for a 2s edit`,
  );
  assert.ok(rms(0.1) > 0.05, `${track}: initial tone missing`);
  for (const time of [0.6, 1.2, 1.8])
    assert.ok(rms(time) < 0.001, `${track}: expected silence at ${time}`);
  console.log(
    `${track}: ${samples.length / 48000}s, tone then silence through both clips`,
  );
}
