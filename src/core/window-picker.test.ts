import test from "node:test";
import assert from "node:assert/strict";
import { windowAtPoint, windowDisplayId } from "./window-picker";
const back = {
  id: 1,
  name: "Back",
  width: 600,
  height: 400,
  bounds: { x: -200, y: -100, width: 600, height: 400 },
  order: 9,
};
const front = {
  id: 2,
  name: "Front",
  width: 100,
  height: 100,
  bounds: { x: 0, y: 0, width: 100, height: 100 },
  order: 1,
};
test("window targeting respects native stacking order, not source array order", () => {
  assert.equal(windowAtPoint([back, front], 50, 50)?.id, 2);
  assert.equal(windowAtPoint([front, back], 50, 50)?.id, 2);
  assert.equal(windowAtPoint([front, back], -150, -50)?.id, 1);
  assert.equal(windowAtPoint([back, front], 100, 50)?.id, 1);
  assert.equal(windowAtPoint([back, front], 500, 500), null);
});
test("window targeting ignores missing or invalid geometry", () => {
  assert.equal(windowAtPoint([{ ...front, bounds: undefined }], 20, 20), null);
  assert.equal(
    windowAtPoint(
      [{ ...front, bounds: { ...front.bounds, width: NaN } }],
      20,
      20,
    ),
    null,
  );
  assert.equal(windowAtPoint([front], Infinity, 20), null);
});
test("spanning windows choose largest screen intersection in desktop coordinates", () => {
  const displays = [
    { id: 1, bounds: { x: -1000, y: 0, width: 1000, height: 800 } },
    { id: 2, bounds: { x: 0, y: 0, width: 1000, height: 800 } },
  ];
  assert.equal(
    windowDisplayId({ x: -100, y: 0, width: 600, height: 400 }, displays),
    2,
  );
  assert.equal(
    windowDisplayId({ x: -600, y: 0, width: 700, height: 400 }, displays),
    1,
  );
  assert.equal(
    windowDisplayId({ x: 4000, y: 0, width: 600, height: 400 }, displays),
    null,
  );
});
