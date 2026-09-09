import test from "node:test";
import assert from "node:assert/strict";
import { createProject, type Mask } from "./project";
import { videoGeometry } from "./compositor";
import { moveMask } from "./mask-drag";
test("mask movement follows preview pixels through crop and zoom", () => {
  const p = createProject({
    file: "fixture",
    width: 1920,
    height: 1080,
    duration: 4000,
    hasAudio: false,
  });
  p.crop = { x: 200, y: 100, width: 1200, height: 800 };
  p.zooms = [
    {
      id: "z",
      start: 0,
      end: 4000,
      x: 0.5,
      y: 0.5,
      scale: 2,
      mode: "manual",
      disabled: false,
    },
  ];
  const mask: Mask = {
    id: "m",
    start: 0,
    end: 4000,
    x: 0.4,
    y: 0.4,
    width: 0.1,
    height: 0.1,
    type: "blur",
    strength: 10,
  };
  const g = videoGeometry(p, 2000, 800, 600);
  const moved = moveMask(p, mask, 2000, 800, 600, 30, -20);
  assert.ok(
    Math.abs((((moved.x - mask.x) * p.source.width) / g.cw) * g.w - 30) < 1e-8,
  );
  assert.ok(
    Math.abs((((moved.y - mask.y) * p.source.height) / g.ch) * g.h + 20) < 1e-8,
  );
  assert.equal(moved.width, mask.width);
  assert.equal(moved.height, mask.height);
  assert.deepEqual(moveMask(p, mask, 2000, 800, 600, 0, 0), mask);
  assert.equal(mask.x, 0.4, "preview movement must not mutate the saved mask");
  const low = moveMask(p, mask, 2000, 800, 600, -10000, -10000);
  const high = moveMask(p, mask, 2000, 800, 600, 10000, 10000);
  assert.equal(low.x, 0);
  assert.equal(low.y, 0);
  assert.equal(high.x, 0.9);
  assert.equal(high.y, 0.9);
});
