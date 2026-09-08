import test from "node:test";
import assert from "node:assert/strict";
import { clampCrop, resizeCrop } from "./crop";
import { createProject, validateProject } from "./project";
import { dimensions } from "./compositor";
test("crop movement and handles stay inside the source without inverted edges", () => {
  const r = { x: 20, y: 10, width: 50, height: 60 };
  assert.deepEqual(resizeCrop(r, "move", 100, -100, 100, 100), {
    x: 50,
    y: 0,
    width: 50,
    height: 60,
  });
  assert.deepEqual(resizeCrop(r, "nw", 100, 100, 100, 100), {
    x: 69,
    y: 69,
    width: 1,
    height: 1,
  });
  assert.deepEqual(
    clampCrop({ x: -4, y: 10, width: 500, height: 60 }, 100, 100),
    { x: 0, y: 10, width: 100, height: 60 },
  );
});
test("saved crop determines Auto aspect ratio and invalid crops are rejected", () => {
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 1000,
    hasAudio: false,
  });
  p.crop = { x: 0, y: 0, width: 360, height: 720 };
  assert.deepEqual(
    dimensions(validateProject(JSON.parse(JSON.stringify(p))), 1280),
    { width: 640, height: 1280 },
  );
  p.crop.x = 1000;
  assert.throws(() => validateProject(p), /invalid crop/);
});
