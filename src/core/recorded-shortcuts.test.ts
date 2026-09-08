import { test } from "node:test";
import assert from "node:assert/strict";
import { recordedShortcuts, type RecordedKey } from "./recorded-shortcuts";
import { recordedProject } from "./recording";
import { validateProject } from "./project";
test("recorded shortcuts suppress typing bursts but retain commands and isolated keys", () => {
  const key = (
    time: number,
    text: string,
    modifiers: RecordedKey["modifiers"] = [],
  ): RecordedKey => ({ time, key: text, modifiers });
  const events = [
    key(0, "H"),
    key(80, "E"),
    key(160, "Y", ["shift"]),
    key(300, "C", ["command"]),
    key(1500, "K"),
    key(2900, "V", ["command", "shift", "command"]),
    { ...key(2950, "V", ["command"]), repeat: true },
  ];
  const clips = recordedShortcuts(events, 4000);
  assert.deepEqual(
    clips.map((s) => [s.start, s.end, s.key, s.modifiers]),
    [
      [300, 1500, "C", ["command"]],
      [1500, 2700, "K", []],
      [2900, 4000, "V", ["shift", "command"]],
    ],
  );
});
test("recording adapter accepts older captures and validates saved keyboard tracks", () => {
  const source = {
    file: "screen.mp4",
    width: 1280,
    height: 720,
    duration: 2000,
    hasAudio: false,
  };
  assert.deepEqual(recordedProject(source, [], "old").shortcuts, []);
  const p = recordedProject(source, [], "new", [
    { time: 1500, key: "S", modifiers: ["command"] },
    { time: NaN, key: "bad", modifiers: [] },
    { time: 2000, key: "end", modifiers: [] },
  ]);
  assert.equal(p.shortcuts?.length, 1);
  assert.equal(p.shortcuts![0].end, 2000);
  assert.deepEqual(
    validateProject(JSON.parse(JSON.stringify(p))).shortcuts,
    p.shortcuts,
  );
});
