import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { createProject, validateProject } from "./project";
import { shortcutAt, shortcutLabel } from "./shortcuts";
import { drawFrame } from "./compositor";
function fixture() {
  const p = createProject({
    file: "test",
    width: 1280,
    height: 720,
    duration: 5000,
    hasAudio: false,
  });
  p.appearance.showShortcuts = true;
  p.shortcuts = [
    {
      id: "first",
      start: 200,
      end: 800,
      key: "C",
      modifiers: ["command", "shift"],
    },
    { id: "cut", start: 1200, end: 1800, key: "X", modifiers: ["command"] },
    { id: "last", start: 2200, end: 2800, key: "V", modifiers: ["command"] },
    { id: "single", start: 3200, end: 3800, key: "K", modifiers: [] },
  ];
  p.segments = [
    { id: "a", start: 0, end: 1000, speed: 1 },
    { id: "b", start: 2000, end: 5000, speed: 2 },
  ];
  return p;
}
test("shortcut overlays respect cuts, speed, disabled events and single-key visibility", () => {
  const p = fixture();
  assert.equal(shortcutLabel(p.shortcuts![0]), "⇧⌘C");
  assert.equal(shortcutAt(p, 200)?.id, "first");
  assert.equal(shortcutAt(p, 800), null);
  assert.equal(shortcutAt(p, 1000), null);
  assert.equal(shortcutAt(p, 1100)?.id, "last");
  assert.equal(shortcutAt(p, 1400), null);
  assert.equal(shortcutAt(p, 1600), null);
  p.appearance.showSingleKeyShortcuts = true;
  assert.equal(shortcutAt(p, 1600)?.id, "single");
  p.shortcuts![2].disabled = true;
  assert.equal(shortcutAt(p, 1100), null);
  p.appearance.showShortcuts = false;
  assert.equal(shortcutAt(p, 200), null);
});
test("shortcut project migration and validation preserve edits and reject malformed tracks", () => {
  const p = fixture();
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(p))).shortcuts,
    p.shortcuts,
  );
  const old = JSON.parse(JSON.stringify(p));
  delete old.shortcuts;
  delete old.appearance.shortcutSize;
  assert.equal(validateProject(old).appearance.shortcutSize, 1);
  for (const patch of [
    { end: 6000 },
    { start: -1 },
    { modifiers: ["invalid"] },
    { modifiers: ["command", "command"] },
    { key: "" },
    { disabled: 1 },
  ]) {
    const bad = JSON.parse(JSON.stringify(p));
    Object.assign(bad.shortcuts[0], patch);
    assert.throws(() => validateProject(bad), /shortcut/);
  }
});
test("shared compositor renders shortcut labels deterministically and global hiding removes them", () => {
  const p = fixture();
  const src = createCanvas(1280, 720),
    out = createCanvas(1280, 720),
    c = out.getContext("2d");
  const frame = (time: number) => {
    drawFrame(
      c as unknown as CanvasRenderingContext2D,
      src as unknown as CanvasImageSource,
      p,
      time,
      1280,
      720,
    );
    return Buffer.from(c.getImageData(0, 0, 1280, 720).data);
  };
  const empty = frame(0),
    shown = frame(200);
  assert.notDeepEqual(shown, empty);
  assert.deepEqual(frame(800), empty);
  assert.deepEqual(frame(200), shown);
  p.appearance.showShortcuts = false;
  assert.deepEqual(frame(200), empty);
});
