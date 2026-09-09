import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createProject } from "../src/core/project";
import { clickSoundCues } from "../src/core/click-sounds";
import { clickSoundBank, clickAudioChunk } from "../src/core/click-audio";
mkdirSync("work/click-audio", { recursive: true });
const p = createProject({
  file: "fixture",
  width: 64,
  height: 64,
  duration: 4000,
  hasAudio: false,
});
p.segments = [{ id: "a", start: 1000, end: 3000, speed: 2 }];
p.cursor = [
  { time: 250, x: 0.5, y: 0.5, click: true },
  ...[1200, 1300, 2000, 2400].map((time, i) => ({
    time,
    x: 0.5,
    y: 0.5,
    button: 0,
    pressed: i % 2 === 0,
    click: i % 2 === 0,
  })),
];
const cues = clickSoundCues(p);
assert.deepEqual(
  cues.map((c) => [c.time, c.kind]),
  [
    [100, "click"],
    [500, "down"],
    [700, "up"],
  ],
);
for (const profile of ["soft", "mechanical"] as const) {
  const bank = clickSoundBank(profile),
    pcm = new Float32Array(48000);
  for (let start = 0; start < pcm.length; start += 128)
    pcm.set(
      clickAudioChunk(
        cues,
        bank,
        48000,
        start,
        Math.min(128, pcm.length - start),
        0.25,
      ),
      start,
    );
  const out = `work/click-audio/${profile}.wav`;
  execFileSync(
    "/opt/homebrew/bin/ffmpeg",
    [
      "-v",
      "error",
      "-y",
      "-f",
      "f32le",
      "-ar",
      "48000",
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-c:a",
      "pcm_s24le",
      out,
    ],
    { input: Buffer.from(pcm.buffer) },
  );
  const raw = execFileSync("/opt/homebrew/bin/ffmpeg", [
    "-v",
    "error",
    "-i",
    out,
    "-f",
    "f32le",
    "pipe:1",
  ]);
  const decoded = new Float32Array(
    raw.buffer,
    raw.byteOffset,
    raw.byteLength / 4,
  );
  assert.equal(decoded.length, 48000);
  const rms = (t: number) =>
    Math.sqrt(
      decoded
        .slice(Math.round(t * 48000), Math.round((t + 0.01) * 48000))
        .reduce((sum, x) => sum + x * x, 0) / 480,
    );
  for (const t of [0.1, 0.5, 0.7])
    assert.ok(rms(t) > 0.001, `${profile}: missing sound at ${t}`);
  for (const t of [0, 0.08, 0.3, 0.6, 0.9])
    assert.equal(rms(t), 0, `${profile}: expected silence at ${t}`);
  console.log(
    profile,
    "1 second WAV; cues at 100, 500 and 700 ms; silence between cues",
  );
}
