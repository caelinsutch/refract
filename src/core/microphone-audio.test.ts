import test from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject } from "./project";
import { microphoneAudioAt } from "./audio";
import { exportArgs } from "./export";

test("microphone audio follows source edits independently of system mute", () => {
  const p = createProject({
    file: "screen.mp4",
    width: 64,
    height: 64,
    duration: 4000,
    hasAudio: true,
  });
  p.microphoneAudio = {
    file: "media/microphone.m4a",
    volume: 0.4,
    muted: false,
  };
  p.segments = [
    { id: "a", start: 0, end: 1000, speed: 1 },
    { id: "b", start: 2000, end: 4000, speed: 2, volume: 0.5 },
  ];
  p.appearance.muted = true;
  const reopened = validateProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(microphoneAudioAt(reopened, 1250), {
    time: 2500,
    speed: 2,
    volume: 0.2,
  });
  p.segments[1].muted = true;
  assert.equal(microphoneAudioAt(p, 1250)?.volume, 0);
  p.microphoneAudio.muted = true;
  assert.equal(microphoneAudioAt(p, 250)?.volume, 0);
  assert.equal(microphoneAudioAt(p, 2500), null);
  for (const volume of [-1, 2, NaN]) {
    p.microphoneAudio.volume = volume;
    assert.throws(() => validateProject(p), /microphone audio/);
  }
});

test("export resolves microphone and music inputs independently", () => {
  const p = createProject({
    file: "screen.mp4",
    width: 64,
    height: 64,
    duration: 1000,
    hasAudio: true,
  });
  p.microphoneAudio = { file: "mic", volume: 1, muted: false };
  p.backgroundAudio = {
    file: "music",
    name: "Music",
    duration: 500,
    volume: 0.05,
    muted: false,
  };
  assert.throws(
    () => exportArgs(p, "screen", "out", 30, "mp4", "music"),
    /Microphone audio/,
  );
  let args = exportArgs(p, "screen", "out", 30, "mp4", "music", "mic");
  let filters = args[args.indexOf("-filter_complex") + 1];
  assert.match(filters, /\[2:a\]atrim/);
  assert.match(filters, /\[3:a\]atrim/);
  assert.match(filters, /amix=inputs=3/);
  p.appearance.muted = true;
  args = exportArgs(p, "screen", "out", 30, "mp4", "music", "mic");
  assert.ok(!args.includes("screen"));
  assert.ok(args.includes("mic"));
  filters = args[args.indexOf("-filter_complex") + 1];
  assert.match(filters, /\[1:a\]atrim/);
  assert.match(filters, /\[2:a\]atrim/);
  assert.ok(
    !exportArgs(p, "screen", "out", 30, "gif", "music", "mic").includes("mic"),
  );
});
