import { test } from "node:test";
import assert from "node:assert/strict";
import { clipAudioGain } from "./audio";
import { createProject, splitAt, validateProject } from "./project";
test("clip gain composes with master volume and persists through splits", () => {
  const p = createProject({
    file: "test",
    width: 640,
    height: 360,
    duration: 4000,
    hasAudio: true,
  });
  p.appearance.volume = 0.5;
  p.segments[0].volume = 0.25;
  assert.equal(clipAudioGain(p, p.segments[0]), 0.125);
  const split = splitAt(p, 2000);
  assert.ok(split.segments.every((s) => s.volume === 0.25));
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(split))).segments,
    split.segments,
  );
  p.segments[0].muted = true;
  assert.equal(clipAudioGain(p, p.segments[0]), 0);
  p.segments[0].muted = false;
  p.appearance.muted = true;
  assert.equal(clipAudioGain(p, p.segments[0]), 0);
  const invalid = JSON.parse(JSON.stringify(p));
  invalid.segments[0].volume = -1;
  assert.throws(() => validateProject(invalid), /clip range/);
});
