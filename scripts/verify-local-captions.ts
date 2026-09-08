import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { captionsFromWords, type TimedWord } from "../src/core/captions";
const run = promisify(execFile);
const dir = path.resolve("work/captions");
await fs.mkdir(dir, { recursive: true });
const aiff = path.join(dir, "spoken-fixture.aiff"),
  wav = path.join(dir, "spoken-fixture.wav");
await run("/usr/bin/say", [
  "-o",
  aiff,
  "Welcome to Refract. This is a local caption test. The video and captions should stay in sync.",
]);
await run("/opt/homebrew/bin/ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  aiff,
  "-ar",
  "16000",
  "-ac",
  "1",
  wav,
]);
const info = JSON.parse(
  (
    await run("/opt/homebrew/bin/ffprobe", [
      "-v",
      "error",
      "-show_format",
      "-of",
      "json",
      wav,
    ])
  ).stdout,
);
const duration = Number(info.format.duration) * 1000;
const { stdout } = await run(
  path.resolve("native/.build/refract-transcribe"),
  [wav, "en-US"],
  { timeout: 1200000, maxBuffer: 1024 * 1024 },
);
const result = JSON.parse(stdout.trim().split("\n").at(-1)!);
const words: TimedWord[] = result.words;
assert.ok(words.length >= 10);
assert.match(words.map((w) => w.text).join(" "), /local caption test/i);
assert.ok(
  words.every(
    (w) => w.start >= 0 && w.end > w.start && w.end <= duration + 100,
  ),
);
assert.ok(words.every((w, i) => i === 0 || w.start >= words[i - 1].start));
const captions = captionsFromWords(words, duration);
assert.ok(captions.length >= 2);
await fs.writeFile(
  path.join(dir, "transcription-result.json"),
  JSON.stringify({ duration, ...result, captions }, null, 2),
);
console.log(
  `Local Swift transcription passed: ${words.length} timed words, ${captions.length} captions, ${(duration / 1000).toFixed(3)} seconds.`,
);
