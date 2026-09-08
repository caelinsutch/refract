import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject } from "./project";
import { previewDimensions } from "./compositor";

test("preview fits landscape and portrait layouts at native display density", () => {
  const p = createProject({
    file: "test",
    width: 1920,
    height: 1080,
    duration: 1000,
    hasAudio: false,
  });
  const retina = previewDimensions(p, 1600, 900, 2);
  assert.deepEqual(retina, {
    cssWidth: 1600,
    cssHeight: 900,
    width: 3200,
    height: 1800,
  });
  assert.deepEqual(previewDimensions(p, 1600, 900, 1), {
    cssWidth: 1600,
    cssHeight: 900,
    width: 1600,
    height: 900,
  });
  p.appearance.ratio = "9:16";
  assert.deepEqual(previewDimensions(p, 1000, 800, 2), {
    cssWidth: 450,
    cssHeight: 800,
    width: 900,
    height: 1600,
  });
  const fractional = previewDimensions(p, 1000, 801, 1.5);
  assert.equal(fractional.height, 1202);
  assert.ok(fractional.width >= fractional.cssWidth * 1.5 - 0.5);
});
