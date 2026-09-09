import { createCanvas } from "@napi-rs/canvas";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import assert from "node:assert/strict";
import { createProject } from "../src/core/project";
import { finishExport } from "../src/core/export-job";
import {
  waitForEncoderFinalization,
  writeEncoderFrame,
} from "../src/core/export-process";
import { exportArgs } from "../src/core/export";
const dir = path.resolve("work/background-audio");
mkdirSync(dir, { recursive: true });
const ffmpeg = "/opt/homebrew/bin/ffmpeg";
const tone = (file: string, frequency: number, duration: number) =>
  execFileSync(ffmpeg, [
    "-v",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${frequency}:duration=${duration}:sample_rate=48000`,
    file,
  ]);
const source = path.join(dir, "source.wav"),
  music = path.join(dir, "music.wav");
tone(source, 440, 4);
tone(music, 880, 0.5);
const p = createProject({
  file: "source.wav",
  width: 64,
  height: 64,
  duration: 4000,
  hasAudio: true,
});
p.backgroundAudio = {
  file: "music.wav",
  name: "Music",
  duration: 500,
  volume: 0.25,
  muted: false,
};
p.segments = [
  { id: "a", start: 0, end: 1000, speed: 1, volume: 0.5 },
  { id: "b", start: 2000, end: 4000, speed: 2, volume: 0.5 },
];
const canvas = createCanvas(64, 64);
canvas.getContext("2d").fillRect(0, 0, 64, 64);
const frame = canvas.toBuffer("image/png");
for (const muted of [false, true]) {
  p.appearance.muted = muted;
  const out = path.join(dir, muted ? "music-only.mp4" : "mixed.mp4");
  const temp = out + ".pending.mp4";
  const child = spawn(ffmpeg, exportArgs(p, source, temp, 30, "mp4", music), {
    stdio: ["pipe", "ignore", "pipe"],
  });
  let errors = "";
  child.stderr.on("data", (d) => (errors += d));
  const done = once(child, "close").then(([code]) => {
    assert.equal(code, 0, errors);
  });
  void done.catch(() => {});
  child.stdin.on("error", () => {});
  for (let i = 0; i < 60; i++) await writeEncoderFrame(child, frame);
  child.stdin.end();
  await finishExport(
    { temp, dest: out, done, cancelled: false },
    waitForEncoderFinalization(child, done, temp),
  );
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
  const amplitude = (start: number, f: number) => {
    let re = 0,
      im = 0;
    const n = 12000;
    for (let i = 0; i < n; i++) {
      const x = samples[Math.round(start * 48000) + i];
      const angle = (2 * Math.PI * f * i) / 48000;
      re += x * Math.cos(angle);
      im += x * Math.sin(angle);
    }
    return (2 * Math.hypot(re, im)) / n;
  };
  const observations = [0.25, 1.25].map((t) => ({
    time: t,
    source: amplitude(t, 440),
    music: amplitude(t, 880),
  }));
  for (const result of observations) {
    assert.ok(Math.abs(result.music - 0.03125) < 0.003, JSON.stringify(result));
    assert.ok(
      muted ? result.source < 0.002 : Math.abs(result.source - 0.0625) < 0.006,
      JSON.stringify(result),
    );
  }
  console.log(muted ? "Music only" : "Mixed", JSON.stringify(observations));
}
