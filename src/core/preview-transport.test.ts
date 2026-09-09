import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "./project";
import { previewTransport } from "./preview-transport";
function fixture() {
  const p = createProject({
    file: "video.mp4",
    width: 64,
    height: 64,
    duration: 5000,
    hasAudio: false,
  });
  p.segments = [
    { id: "a", start: 500, end: 1500, speed: 1 },
    { id: "b", start: 3000, end: 5000, speed: 2 },
  ];
  return p;
}
const media = (time: number) => ({
  time,
  seeking: false,
  ready: true,
  ended: false,
});
test("preview follows source progress and holds during seeking, buffering, and a stationary media clock", () => {
  const p = fixture();
  assert.equal(previewTransport(p, 0, media(750), false).position, 250);
  for (let i = 0; i < 100; i++)
    assert.equal(previewTransport(p, 250, media(750), false).position, 250);
  assert.equal(
    previewTransport(p, 250, { ...media(1300), seeking: true }, false).position,
    250,
  );
  assert.equal(
    previewTransport(p, 250, { ...media(1300), ready: false }, false).position,
    250,
  );
  assert.equal(previewTransport(p, 250, media(NaN), false).position, 250);
});
test("cuts seek the next retained source range and speed affects the source-to-edit mapping once", () => {
  const p = fixture();
  const cut = previewTransport(p, 990, media(1510), false);
  assert.deepEqual(cut, { position: 1000, seek: 3000, ended: false });
  assert.equal(
    previewTransport(p, cut.position, { ...media(1510), seeking: true }, false)
      .position,
    1000,
  );
  assert.deepEqual(previewTransport(p, 1000, media(3500), false), {
    position: 1250,
    ended: false,
  });
  assert.equal(previewTransport(p, 1250, media(4000), false).position, 1500);
});
test("final playback publishes the exact end or loops to the first retained source time", () => {
  const p = fixture();
  assert.deepEqual(previewTransport(p, 1990, media(5000), false), {
    position: 2000,
    ended: true,
  });
  assert.deepEqual(previewTransport(p, 1990, media(5000), true), {
    position: 0,
    seek: 500,
    ended: false,
  });
  assert.deepEqual(
    previewTransport(p, 1990, { ...media(4999.9), ended: true }, false),
    { position: 2000, ended: true },
  );
});
