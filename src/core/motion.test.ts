import test from "node:test";
import assert from "node:assert/strict";
import { createProject, zoomAt } from "./project";
function fixture() {
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 10000,
    hasAudio: false,
  });
  p.zooms = [
    {
      id: "a",
      start: 1000,
      end: 2200,
      scale: 2,
      x: 0.3,
      y: 0.4,
      mode: "manual",
      disabled: false,
    },
    {
      id: "b",
      start: 2200,
      end: 3500,
      scale: 3,
      x: 0.7,
      y: 0.6,
      mode: "manual",
      disabled: false,
    },
  ];
  return p;
}
test("screen springs stay continuous at adjacent zoom boundaries and settle after zoom out", () => {
  const p = fixture();
  for (const style of ["focused", "smooth"] as const) {
    p.appearance.animation = style;
    for (const boundary of [1000, 2200, 3500]) {
      const a = zoomAt(p, boundary - 0.001),
        b = zoomAt(p, boundary + 0.001);
      for (const key of ["scale", "x", "y"] as const)
        assert.ok(Math.abs(a[key] - b[key]) < 0.0001);
    }
    const expected = zoomAt(p, 2600);
    zoomAt(p, 6000);
    zoomAt(p, 1500);
    assert.deepEqual(zoomAt(p, 2600), expected);
    assert.ok(Math.abs(zoomAt(p, 8000).scale - 1) < 0.00001);
  }
});
test("screen motion honors instantaneous changes and ignores disabled or empty auto zooms", () => {
  const p = fixture();
  p.appearance.animation = "instant";
  assert.equal(zoomAt(p, 1000).scale, 2);
  assert.equal(zoomAt(p, 2200).scale, 3);
  assert.equal(zoomAt(p, 3500).scale, 1);
  p.zooms = p.zooms.map((z) => ({ ...z, mode: "auto" }));
  assert.equal(zoomAt(p, 2600).scale, 1);
  p.zooms = p.zooms.map((z) => ({ ...z, mode: "manual", disabled: true }));
  assert.equal(zoomAt(p, 2600).scale, 1);
});

test("automatic zoom retargets preserve motion at click timestamps", () => {
  const p = fixture();
  p.zooms = [{ ...p.zooms[0], end: 5000, mode: "auto" }];
  p.cursor = [
    { time: 1100, x: 0.2, y: 0.3, click: true },
    { time: 1600, x: 0.8, y: 0.7, click: true },
    { time: 1700, x: 0.3, y: 0.6, click: true },
  ];
  const before = zoomAt(p, 1699.999),
    after = zoomAt(p, 1700.001);
  assert.ok(Math.abs(before.x - after.x) < 0.0001);
  assert.ok(Math.abs(before.y - after.y) < 0.0001);
  assert.ok(Math.abs(zoomAt(p, 4000).x - 0.3) < 0.001);
});
