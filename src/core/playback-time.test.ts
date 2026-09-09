import assert from "node:assert/strict";
import { test } from "node:test";
import { playbackTime } from "./playback-time";
test("paused preview uses frame numbers instead of decimal hundredths", () => {
  assert.equal(playbackTime(500, 60, 12_000), "0:00.30");
  assert.equal(playbackTime(500, 24, 12_000), "0:00.12");
  assert.equal(playbackTime(999, 30, 12_000), "0:00.29");
  assert.equal(playbackTime(1000, 60, 12_000), "0:01.00");
});
test("preview duration determines minute padding and hour display", () => {
  assert.equal(playbackTime(65_500, 60, 599_999), "1:05.30");
  assert.equal(playbackTime(65_500, 60, 600_000), "01:05.30");
  assert.equal(playbackTime(65_500, 60, 600_000, false), "01:05");
  assert.equal(playbackTime(3_661_500, 60, 3_700_000, false), "01:01:01.30");
});
test("invalid preview input produces a bounded readout", () => {
  assert.equal(playbackTime(-2, 60, 1000), "0:00.00");
  assert.equal(playbackTime(NaN, 0, 1000), "0:00.00");
});
