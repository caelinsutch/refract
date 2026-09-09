import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject, zoomAt } from "./project";
import { screenExposure } from "./screen-blur";
function fixture() {
  const p = createProject({
    file: "test",
    width: 400,
    height: 200,
    duration: 5000,
    hasAudio: false,
  });
  p.zooms = [
    {
      id: "z",
      start: 1000,
      end: 3000,
      scale: 2,
      x: 0.3,
      y: 0.6,
      mode: "manual",
      disabled: false,
      instantAnimation: true,
    },
  ];
  return p;
}
test("instant zoom cuts at both boundaries while ordinary zooms keep spring entry", () => {
  const p = fixture();
  assert.equal(zoomAt(p, 999).scale, 1);
  assert.equal(zoomAt(p, 1000).scale, 2);
  assert.equal(zoomAt(p, 3000).scale, 1);
  p.zooms = [{ ...p.zooms[0], instantAnimation: false }];
  assert.equal(zoomAt(p, 1000).scale, 1);
  assert(zoomAt(p, 1100).scale < 2);
});
test("automatic retargets inside an instant zoom remain smooth and seek deterministic", () => {
  const p = fixture();
  p.zooms = [{ ...p.zooms[0], mode: "auto", snapToEdgesRatio: 0 }];
  p.cursor = [
    { time: 1000, x: 0.3, y: 0.4 },
    { time: 2000, x: 0.8, y: 0.7 },
  ];
  assert(Math.abs(zoomAt(p, 2000.001).x - zoomAt(p, 1999.999).x) < 0.0001);
  const expected = zoomAt(p, 2300);
  zoomAt(p, 4500);
  zoomAt(p, 500);
  assert.deepEqual(zoomAt(p, 2300), expected);
});
test("instant boundary frames avoid motion-blur ghosts and persist per zoom", () => {
  const p = fixture();
  p.appearance.screenZoomBlur = 1;
  p.appearance.motionBlurAmount = 1;
  assert.equal(screenExposure(p, 1000).length, 1);
  const restored = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.zooms[0].instantAnimation, true);
  const bad = JSON.parse(JSON.stringify(p));
  bad.zooms[0].instantAnimation = "yes";
  assert.throws(() => validateProject(bad), /invalid zoom/);
  p.zooms = [{ ...p.zooms[0], disabled: true }];
  assert.equal(zoomAt(p, 1000).scale, 1);
});
