import { test } from "node:test";
import assert from "node:assert/strict";
import { springState } from "./spring";
import { animatedCursorAt } from "./cursor";
import { createProject, validateProject } from "./project";

test("spring evolution handles under, critical, and over damping independently of sample intervals", () => {
  for (const config of [
    { stiffness: 100, damping: 5, mass: 1 },
    { stiffness: 100, damping: 20, mass: 1 },
    { stiffness: 100, damping: 40, mass: 1 },
    { stiffness: 5, damping: 200, mass: 0.1 },
    { stiffness: 600, damping: 5, mass: 15 },
  ]) {
    const direct = springState(0.2, 0.7, 0.8, 0.3, config);
    const first = springState(0.2, 0.7, 0.8, 0.1, config);
    const split = springState(first[0], first[1], 0.8, 0.2, config);
    assert.ok(direct.every(Number.isFinite));
    assert.ok(Math.abs(direct[0] - split[0]) < 1e-10);
    assert.ok(Math.abs(direct[1] - split[1]) < 1e-10);
    const settled = springState(0.2, 0.7, 0.8, 1000, config);
    assert.ok(Math.abs(settled[0] - 0.8) < 1e-8);
    assert.ok(Math.abs(settled[1]) < 1e-8);
  }
});

test("custom cursor spring survives project round trip and updates cached motion", () => {
  const p = createProject({
    file: "test",
    width: 100,
    height: 100,
    duration: 1000,
    hasAudio: false,
  });
  p.cursor = [
    { time: 0, x: 0.1, y: 0.1, click: false },
    { time: 100, x: 0.9, y: 0.9, click: false },
  ];
  p.appearance.cursorSpring = { stiffness: 50, damping: 40, mass: 2 };
  const restored = validateProject(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(restored.appearance.cursorSpring, p.appearance.cursorSpring);
  const custom = animatedCursorAt(
    p.cursor,
    300,
    "smooth",
    p.appearance.cursorSpring,
  );
  const preset = animatedCursorAt(p.cursor, 300, "smooth");
  assert.notDeepEqual(custom, preset);
  assert.deepEqual(
    animatedCursorAt(p.cursor, 300, "smooth", p.appearance.cursorSpring),
    custom,
  );
  restored.appearance.cursorSpring!.mass = 0;
  assert.throws(() => validateProject(restored), /invalid cursor spring/);
});
