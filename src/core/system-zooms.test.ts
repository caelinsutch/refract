import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject, validateProject, zoomAt } from "./project";
import { effectiveZooms } from "./system-zooms";
import { reduceHistory, emptyHistory } from "./history";
function fixture() {
  const p = createProject({
    file: "test",
    width: 400,
    height: 200,
    duration: 5000,
    hasAudio: false,
  });
  Object.assign(p.appearance, {
    ratio: "1:2",
    padding: 0,
    alwaysKeepZoomedIn: true,
    animation: "instant",
  });
  p.cursor = [
    { time: 0, x: 0.5, y: 0.5 },
    { time: 4500, x: 0.7, y: 0.5 },
  ];
  return p;
}
test("vertical gap following fills the recording without creating editable zooms", () => {
  const p = fixture();
  assert.deepEqual(
    effectiveZooms(p).map((z) => [z.start, z.end]),
    [[0, 5000]],
  );
  assert.equal(zoomAt(p, 500).scale, 4);
  assert.equal(p.zooms.length, 0);
  p.appearance.ratio = "16:9";
  assert.equal(effectiveZooms(p).length, 0);
  assert.equal(zoomAt(p, 500).scale, 1);
  p.appearance.ratio = "Auto";
  assert.equal(effectiveZooms(p).length, 0);
});
test("explicit ranges keep priority and disabled ranges do not reserve gaps", () => {
  const p = fixture();
  p.zooms = [
    {
      id: "explicit",
      start: 1000,
      end: 2000,
      scale: 2,
      x: 0.5,
      y: 0.5,
      mode: "manual",
      disabled: false,
    },
    {
      id: "disabled",
      start: 3000,
      end: 4000,
      scale: 3,
      x: 0.5,
      y: 0.5,
      mode: "manual",
      disabled: true,
    },
  ];
  assert.deepEqual(
    effectiveZooms(p).map((z) => [z.start, z.end]),
    [
      [0, 999],
      [1000, 2000],
      [2001, 5000],
    ],
  );
  assert.equal(zoomAt(p, 1500).scale, 8);
  assert.equal(zoomAt(p, 3500).scale, 4);
  assert.equal(p.zooms.length, 2);
});
test("vertical preference survives roundtrip and undo and defaults off for old projects", () => {
  const p = fixture(),
    restored = validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.appearance.alwaysKeepZoomedIn, true);
  const old = JSON.parse(JSON.stringify(p));
  delete old.appearance.alwaysKeepZoomedIn;
  assert.equal(validateProject(old).appearance.alwaysKeepZoomedIn, false);
  const bad = JSON.parse(JSON.stringify(p));
  bad.appearance.alwaysKeepZoomedIn = "yes";
  assert.throws(() => validateProject(bad), /vertical framing/);
  let h = reduceHistory(emptyHistory, { type: "load", project: restored });
  h = reduceHistory(h, {
    type: "edit",
    project: {
      ...restored,
      appearance: { ...restored.appearance, alwaysKeepZoomedIn: false },
    },
    now: 1,
  });
  h = reduceHistory(h, { type: "undo" });
  assert.equal(h.present!.appearance.alwaysKeepZoomedIn, true);
});
