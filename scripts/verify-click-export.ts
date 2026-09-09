import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { createCanvas } from "@napi-rs/canvas";
import { Readable, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { createProject } from "../src/core/project";
import { exportArgs } from "../src/core/export";
import { clickSoundCues } from "../src/core/click-sounds";
import { clickSoundBank, clickAudioChunk } from "../src/core/click-audio";
import {
  completeEncoderInputs,
  writeEncoderFrame,
  waitForEncoderFinalization,
} from "../src/core/export-process";
mkdirSync("work/click-audio", { recursive: true });
const p = createProject({
  file: "unused",
  width: 64,
  height: 64,
  duration: 2000,
  hasAudio: false,
});
p.appearance.clickSound = "soft";
p.appearance.clickSoundVolume = 0.25;
p.segments = [{ id: "a", start: 0, end: 2000, speed: 2 }];
p.cursor = [200, 1000, 1400].map((time) => ({
  time,
  x: 0.5,
  y: 0.5,
  click: true,
}));
const cues = clickSoundCues(p),
  bank = clickSoundBank("soft");
const file = "work/click-audio/clicks.mp4";
const child = spawn(
  "/opt/homebrew/bin/ffmpeg",
  exportArgs(p, "unused", file, 30, "mp4", undefined, undefined, "pipe:3"),
  { stdio: ["pipe", "ignore", "pipe", "pipe"] },
);
let errors = "";
child.stderr!.on("data", (d) => (errors += d));
child.stdin!.on("error", () => {});
const encoded = once(child, "close").then(([code]) =>
  assert.equal(code, 0, errors),
);
void encoded.catch(() => {});
const audio = pipeline(
  Readable.from([
    Buffer.from(clickAudioChunk(cues, bank, 48000, 0, 48000, 0.25).buffer),
  ]),
  child.stdio[3] as Writable,
);
void audio.catch(() => {});
const done = completeEncoderInputs(child, encoded, [audio]);
void done.catch(() => {});
const canvas = createCanvas(64, 64);
canvas.getContext("2d").fillRect(0, 0, 64, 64);
const frame = canvas.toBuffer("image/png");
for (let i = 0; i < 30; i++) await writeEncoderFrame(child, frame);
child.stdin!.end();
await waitForEncoderFinalization(child, done, file, 15000);
const raw = execFileSync("/opt/homebrew/bin/ffmpeg", [
  "-v",
  "error",
  "-i",
  file,
  "-vn",
  "-ac",
  "1",
  "-ar",
  "48000",
  "-f",
  "f32le",
  "pipe:1",
]);
const pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const rms = (t: number) =>
  Math.sqrt(
    pcm
      .slice(t * 48000, (t + 0.01) * 48000)
      .reduce((sum, x) => sum + x * x, 0) / 480,
  );
for (const t of [0.1, 0.5, 0.7]) assert.ok(rms(t) > 0.001, `missing cue ${t}`);
for (const t of [0.02, 0.3, 0.6, 0.9])
  assert.ok(rms(t) < 0.0001, `unexpected audio ${t}`);
console.log(
  "MP4 AAC: clicks at 100/500/700 ms with silence between; PCM input pipe completed",
);
