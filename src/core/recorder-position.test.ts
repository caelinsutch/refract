import test from "node:test";
import assert from "node:assert/strict";
import {
  recorderBounds,
  rememberRecorderPosition,
  readRecorderPosition,
} from "../../desktop/recorder-position.cts";
const primary = { id: 1, workArea: { x: 0, y: 25, width: 1728, height: 1040 } };
const secondary = {
  id: 2,
  workArea: { x: -1920, y: -100, width: 1920, height: 1080 },
};
test("recorder restores a dragged position on a display with negative coordinates", () => {
  const original = { x: -1740, y: 580, width: 855, height: 64 };
  const saved = readRecorderPosition(
    JSON.parse(JSON.stringify(rememberRecorderPosition(original, secondary))),
  );
  assert.deepEqual(
    recorderBounds(saved, [primary, secondary], primary, false),
    original,
  );
  const expanded = recorderBounds(saved, [primary, secondary], primary, true);
  assert.equal(expanded.y + expanded.height, original.y + original.height);
  assert.equal(expanded.x, original.x);
});
test("temporary expansion clamping does not change the remembered collapsed position", () => {
  const original = { x: 120, y: 70, width: 855, height: 64 };
  const saved = rememberRecorderPosition(original, primary);
  assert.equal(recorderBounds(saved, [primary], primary, true).y, 25);
  assert.deepEqual(recorderBounds(saved, [primary], primary, false), original);
});
test("missing monitor and invalid stored preferences fall back inside the primary work area", () => {
  const saved = { displayId: 2, left: 1800, bottom: -200 };
  const restored = recorderBounds(saved, [primary], primary, false);
  assert.deepEqual(restored, { x: 873, y: 1001, width: 855, height: 64 });
  for (const value of [
    null,
    {},
    { displayId: 1, left: "12", bottom: 0 },
    { displayId: 1, left: Infinity, bottom: 0 },
  ]) {
    assert.equal(readRecorderPosition(value), undefined);
  }
});
