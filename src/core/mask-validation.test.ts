import test from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject, type Mask } from "./project";
function fixture() {
  const p = createProject({
    file: "fixture",
    width: 64,
    height: 64,
    duration: 4000,
    hasAudio: false,
  });
  p.masks = [
    {
      id: "m",
      start: 0,
      end: 2000,
      x: 0.9,
      y: 0.9,
      width: 0.2,
      height: 0.2,
      type: "blur",
      strength: 20,
    },
  ];
  return p;
}
test("saved masks preserve prior edge clipping and zero-size controls", () => {
  const p = fixture();
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(p))).masks,
    p.masks,
  );
  p.masks[0].width = 0;
  p.masks[0].strength = 0;
  assert.deepEqual(validateProject(p).masks, p.masks);
});
test("invalid masks are rejected before loading or saving a project", () => {
  for (const patch of [
    { id: "" },
    { start: -1 },
    { end: 0 },
    { end: 4001 },
    { x: NaN },
    { y: -0.1 },
    { width: 1.1 },
    { height: -1 },
    { strength: 101 },
    { type: "unknown" },
  ]) {
    const p = fixture();
    Object.assign(p.masks[0], patch);
    assert.throws(() => validateProject(p), /mask data/);
  }
  const p = fixture();
  p.masks.push({ ...p.masks[0] });
  assert.throws(() => validateProject(p), /mask data/);
  p.masks = [null as unknown as Mask];
  assert.throws(() => validateProject(p), /mask data/);
});
