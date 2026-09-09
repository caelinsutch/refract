import { test } from "node:test";
import assert from "node:assert/strict";
import { exportFrameRate, isExportFrameRate } from "./export-settings";
import { recordingCompletion } from "./recording-completion";

test("format changes choose the next lower compatible frame rate", () => {
  assert.equal(exportFrameRate("gif", 60), 50);
  assert.equal(exportFrameRate("gif", 24), 20);
  assert.equal(exportFrameRate("mp4", 15), 10);
  assert.equal(exportFrameRate("mp4", 50), 50);
  assert.equal(exportFrameRate("gif", 1), 10);
});

test("encoder validation and persisted quick settings accept the reference rates", () => {
  assert.equal(isExportFrameRate("gif", 24), false);
  assert.equal(isExportFrameRate("mp4", 15), false);
  assert.equal(isExportFrameRate("mp4", "50"), false);
  assert.equal(isExportFrameRate("unknown", 30), false);
  for (const fps of [10, 20, 24, 25, 30, 50, 60]) {
    assert.equal(isExportFrameRate("mp4", fps), true);
    assert.equal(recordingCompletion({ fps }).fps, fps);
  }
  for (const fps of [10, 15, 20, 25, 30, 50])
    assert.equal(isExportFrameRate("gif", fps), true);
});
