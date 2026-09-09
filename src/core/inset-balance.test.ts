import test from "node:test";
import assert from "node:assert/strict";
import { insetEdges, normalizeInsetBalance } from "./inset-balance";
import { createProject, validateProject } from "./project";
import { videoGeometry, sourcePointAt } from "./compositor";
test("inset balance clamps, snaps and preserves total inset", () => {
  assert.deepEqual(normalizeInsetBalance(-1, 2), { x: 0, y: 1 });
  assert.deepEqual(normalizeInsetBalance(0.505, 0.495), { x: 0.5, y: 0.5 });
  assert.deepEqual(insetEdges({ inset: 20 }), {
    left: 20,
    right: 20,
    top: 20,
    bottom: 20,
  });
  assert.deepEqual(insetEdges({ inset: 20, insetBalance: { x: 0.75, y: 0 } }), {
    left: 30,
    right: 10,
    top: 0,
    bottom: 40,
  });
});
test("balance shifts source and hit testing while preserving the outer frame", () => {
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 2000,
    hasAudio: false,
  });
  p.appearance.inset = 20;
  const before = videoGeometry(p, 0, 1280, 720);
  p.appearance.insetBalance = { x: 0.75, y: 0 };
  const after = videoGeometry(p, 0, 1280, 720);
  assert.equal(after.x - before.x, 10);
  assert.equal(after.y - before.y, -20);
  assert.equal(after.x - 30, before.x - 20);
  assert.equal(after.y, before.y - 20);
  assert.deepEqual(
    sourcePointAt(
      p,
      0,
      1280,
      720,
      after.x + after.w / 2,
      after.y + after.h / 2,
    ),
    { x: 0.5, y: 0.5 },
  );
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(p))).appearance.insetBalance,
    { x: 0.75, y: 0 },
  );
  p.appearance.insetBalance = { x: 2, y: 0 };
  assert.throws(() => validateProject(p), /inset balance/);
});
