import test from "node:test";
import assert from "node:assert/strict";
import { screenCorners, insetAppearance } from "./screen-corners";
import { createProject, validateProject } from "./project";
test("legacy screen corners retain their rendered radii", () => {
  assert.deepEqual(screenCorners({ radius: 18, inset: 30 }), {
    inner: 18,
    outer: 48,
  });
});
test("inset edits retain a twelve-point inner corner and round the outer frame", () => {
  for (const inset of [0, 15, 30, 60]) {
    const updated = { radius: 99, ...insetAppearance(inset) };
    assert.deepEqual(screenCorners(updated), { inner: 12, outer: inset + 12 });
  }
  assert.equal(insetAppearance(20.6).outerRadius, 33);
});
test("outer corner edits preserve the reference's small inner corner floor", () => {
  assert.deepEqual(screenCorners({ radius: 12, inset: 30, outerRadius: 34 }), {
    inner: 4,
    outer: 34,
  });
  assert.deepEqual(screenCorners({ radius: 12, inset: 30, outerRadius: 10 }), {
    inner: 4,
    outer: 10,
  });
  assert.deepEqual(screenCorners({ radius: 12, inset: 30, outerRadius: 3 }), {
    inner: 0,
    outer: 3,
  });
});
test("outer radius survives project round trip and rejects invalid values", () => {
  const p = createProject({
    file: "test.mp4",
    duration: 2000,
    width: 1280,
    height: 720,
    hasAudio: false,
  });
  p.appearance = { ...p.appearance, ...insetAppearance(60) };
  assert.equal(
    validateProject(JSON.parse(JSON.stringify(p))).appearance.outerRadius,
    72,
  );
  for (const value of [-1, 201, Infinity, NaN]) {
    p.appearance.outerRadius = value;
    assert.throws(() => validateProject(p), /outer corner radius/);
  }
});
