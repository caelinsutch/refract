import test from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject } from "./project";
import { normalizeMotionBlur } from "./motion-blur-settings";
test("master blur migration preserves earlier per-component exposure and keeps new projects sharp", () => {
  const p = createProject({
    file: "unused",
    duration: 1000,
    width: 400,
    height: 400,
    hasAudio: false,
  });
  assert.equal(p.appearance.motionBlurAmount, 0);
  delete p.appearance.motionBlurAmount;
  p.appearance.cursorMotionBlur = 0.3;
  p.appearance.screenMoveBlur = 0.7;
  p.appearance.screenZoomBlur = 0;
  const migrated = validateProject(p).appearance;
  assert.ok(
    Math.abs(migrated.motionBlurAmount! * migrated.cursorMotionBlur! - 0.3) <
      1e-10,
  );
  assert.equal(migrated.motionBlurAmount! * migrated.screenMoveBlur!, 0.7);
  assert.equal(migrated.screenZoomBlur, 0);
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(p))).appearance,
    migrated,
  );
  assert.deepEqual(normalizeMotionBlur({}), {
    motionBlurAmount: 0,
    cursorMotionBlur: 1,
    screenMoveBlur: 1,
    screenZoomBlur: 1,
  });
  for (const value of [-1, 2, NaN])
    assert.throws(
      () => normalizeMotionBlur({ cursorMotionBlur: value }),
      /motion blur/,
    );
  const off = normalizeMotionBlur({ ...migrated, motionBlurAmount: 0 });
  assert.equal(off.cursorMotionBlur, migrated.cursorMotionBlur);
  assert.equal(off.motionBlurAmount, 0);
});
