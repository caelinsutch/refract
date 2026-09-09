import test from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject } from "./project";
import { backgroundAudioAt } from "./audio";
import { exportArgs } from "./export";
const fixture = () => {
  const p = createProject({
    file: "video.mp4",
    width: 64,
    height: 64,
    duration: 4000,
    hasAudio: true,
  });
  p.backgroundAudio = {
    file: "media/music.wav",
    name: "Music",
    duration: 500,
    volume: 0.05,
    muted: false,
  };
  p.segments = [
    { id: "a", start: 0, end: 1000, speed: 1 },
    { id: "b", start: 2000, end: 4000, speed: 2 },
  ];
  return p;
};
test("music uses output time and independent gain across edits and save/reopen", () => {
  const p = validateProject(JSON.parse(JSON.stringify(fixture())));
  p.appearance.muted = true;
  for (const t of [1250, 250, 1000, 0])
    assert.deepEqual(backgroundAudioAt(p, t), { time: t % 500, volume: 0.05 });
  p.backgroundAudio!.muted = true;
  assert.equal(backgroundAudioAt(p, 1250)?.volume, 0);
  for (const volume of [-1, 2, NaN]) {
    p.backgroundAudio!.volume = volume;
    assert.throws(() => validateProject(p), /background audio/);
  }
});
test("music exports independently of source audio and stays out of GIFs", () => {
  const p = fixture();
  assert.throws(
    () => exportArgs(p, "source", "out", 30, "mp4"),
    /Background audio/,
  );
  p.appearance.muted = true;
  const musicOnly = exportArgs(p, "source", "out", 30, "mp4", "music");
  assert.ok(musicOnly.includes("music"));
  assert.ok(!musicOnly.includes("source"));
  assert.ok(musicOnly.includes("[music]"));
  assert.ok(
    !exportArgs(p, "source", "out", 30, "gif", "music").includes("music"),
  );
  p.backgroundAudio!.muted = true;
  assert.ok(
    !exportArgs(p, "source", "out", 30, "mp4", "music").includes("music"),
  );
});
