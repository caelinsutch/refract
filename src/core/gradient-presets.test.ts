import test from "node:test";
import assert from "node:assert/strict";
import { gradientColors, gradientPresets } from "./gradient-presets";
import { createProject, validateProject } from "./project";
test("gradient presets retain every stop through project round trip", () => {
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 2000,
    hasAudio: false,
  });
  assert.equal(gradientPresets.length, 69);
  for (const stops of gradientPresets) {
    p.appearance.gradientStops = [...stops];
    assert.deepEqual(
      gradientColors(validateProject(JSON.parse(JSON.stringify(p))).appearance),
      stops,
    );
  }
  p.appearance.gradientStops = undefined;
  assert.deepEqual(gradientColors(p.appearance), [
    p.appearance.color,
    p.appearance.color2,
  ]);
});
test("gradient stops reject malformed palettes", () => {
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 2000,
    hasAudio: false,
  });
  for (const stops of [
    [],
    ["#000000"],
    ["bad", "#ffffff"],
    Array(33).fill("#000000"),
  ]) {
    p.appearance.gradientStops = stops;
    assert.throws(() => validateProject(p), /gradient stops/);
  }
});
