import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "./project";
import { exportDimensions } from "./compositor";
import { exportHeight } from "./export-settings";
const project = () =>
  createProject({
    file: "source.mp4",
    width: 1920,
    height: 1080,
    duration: 1000,
    hasAudio: false,
  });
test("export height preserves aspect ratio and floors even output dimensions", () => {
  const p = project();
  assert.deepEqual(exportDimensions(p, 720), { width: 1280, height: 720 });
  p.appearance.ratio = "4:3";
  assert.deepEqual(exportDimensions(p, 1080), { width: 1440, height: 1080 });
  p.appearance.ratio = "9:16";
  assert.deepEqual(exportDimensions(p, 1080), { width: 606, height: 1080 });
  p.appearance.ratio = "Auto";
  p.crop = { x: 0, y: 0, width: 333, height: 200 };
  assert.deepEqual(exportDimensions(p, 720), { width: 1198, height: 720 });
});
test("wide exports cap width and format heights normalize safely", () => {
  const p = project();
  p.appearance.ratio = "21:9";
  assert.deepEqual(exportDimensions(p, 2160), { width: 3840, height: 1644 });
  assert.equal(exportHeight("gif", 2160), 1080);
  assert.equal(exportHeight("mp4", 480), 720);
  assert.equal(exportHeight("mp4", 3840), 2160);
  assert.throws(() => exportDimensions(p, NaN));
});
