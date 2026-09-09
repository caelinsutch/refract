import test from "node:test";
import assert from "node:assert/strict";
import { clickSoundBank, clickAudioChunk } from "./click-audio";
import type { ClickSoundCue } from "./click-sounds";
test("original click samples are deterministic, distinct and fade to silence", () => {
  const soft = clickSoundBank("soft"),
    mechanical = clickSoundBank("mechanical");
  assert.deepEqual(soft, clickSoundBank("soft"));
  assert.notDeepEqual(soft.click, mechanical.click);
  for (const bank of [soft, mechanical])
    for (const sample of Object.values(bank)) {
      assert.ok(sample.every(Number.isFinite));
      assert.ok(sample[0] === 0);
      assert.ok(Math.max(...sample.map(Math.abs)) > 0.05);
      assert.ok(Math.abs(sample.at(-1)!) < 0.00001);
    }
});
test("chunked click mixing preserves sample timing, tails, gain and overlapping cues", () => {
  const bank = {
    click: new Float32Array([0.4, 0.3, 0.2, 0.1]),
    down: new Float32Array([0.2, 0.1]),
    up: new Float32Array([0.1]),
  };
  const cues: ClickSoundCue[] = [
    { time: 3, sourceTime: 600, kind: "click", button: 0 },
    { time: 5, sourceTime: 900, kind: "down", button: 1 },
  ];
  const full = clickAudioChunk(cues, bank, 1000, 0, 12, 0.5);
  assert.deepEqual(Array.from(full.slice(0, 3)), [0, 0, 0]);
  assert.ok(Math.abs(full[3] - 0.2) < 1e-7);
  assert.ok(Math.abs(full[5] - 0.2) < 1e-7);
  const chunks = [
    ...clickAudioChunk(cues, bank, 1000, 0, 5, 0.5),
    ...clickAudioChunk(cues, bank, 1000, 5, 7, 0.5),
  ];
  assert.deepEqual(chunks, Array.from(full));
  assert.ok(clickAudioChunk(cues, bank, 1000, 0, 12, 0).every((x) => x === 0));
  assert.throws(() => clickAudioChunk(cues, bank, 1000, -1, 2, 1));
});
