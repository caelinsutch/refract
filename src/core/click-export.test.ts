import test from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject } from "./project";
import { exportArgs } from "./export";
test("click audio settings reopen and MP4 maps the independent PCM input", () => {
  const p = createProject({
    file: "source",
    width: 64,
    height: 64,
    duration: 1000,
    hasAudio: false,
  });
  assert.equal(p.appearance.clickSound, "none");
  assert.equal(p.appearance.clickSoundVolume, 0.25);
  p.appearance.clickSound = "mechanical";
  assert.equal(
    validateProject(JSON.parse(JSON.stringify(p))).appearance.clickSound,
    "mechanical",
  );
  assert.throws(() => exportArgs(p, "source", "out", 30, "mp4"), /Click audio/);
  let args = exportArgs(
    p,
    "source",
    "out",
    30,
    "mp4",
    undefined,
    undefined,
    "pipe:3",
  );
  assert.ok(args.includes("f32le"));
  assert.ok(args.includes("[clicks]"));
  assert.ok(!exportArgs(p, "source", "out", 30, "gif").includes("f32le"));
  p.source.hasAudio = true;
  p.microphoneAudio = { file: "mic", volume: 1, muted: false };
  p.backgroundAudio = {
    file: "music",
    name: "music",
    duration: 1000,
    volume: 0.25,
    muted: false,
  };
  args = exportArgs(p, "source", "out", 30, "mp4", "music", "mic", "pipe:3");
  assert.match(args[args.indexOf("-filter_complex") + 1], /\[4:a\]atrim/);
  assert.match(args[args.indexOf("-filter_complex") + 1], /amix=inputs=4/);
  p.appearance.clickSoundVolume = 2;
  assert.throws(() => validateProject(p), /click sound/);
});
