import test from "node:test";
import assert from "node:assert/strict";
import { insetColors } from "./inset-colors";
test("inset suggestions rank opaque edge colors and merge rings", () => {
  assert.deepEqual(
    insetColors([
      [255, 0, 0, 255, 0, 0, 255, 255],
      [0, 0, 255, 255, 0, 255, 0, 0],
    ]),
    ["#0000ff", "#ff0000"],
  );
});
test("inset suggestions are stable, capped and tolerate empty samples", () => {
  assert.deepEqual(insetColors([]), []);
  assert.deepEqual(insetColors([[1, 2, 3, 255, 4, 5, 6, 255]], 1), ["#010203"]);
});
