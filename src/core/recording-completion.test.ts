import test from "node:test";
import assert from "node:assert/strict";
import {
  recordingCompletion,
  RecordingCompletions,
} from "./recording-completion";
test("completion settings normalize stale or invalid persisted values", () => {
  assert.deepEqual(recordingCompletion(null), {
    action: "create-project",
    resolution: 1920,
    fps: 30,
  });
  assert.deepEqual(
    recordingCompletion({ action: "share", resolution: 99999, fps: 120 }),
    recordingCompletion(null),
  );
  assert.deepEqual(
    recordingCompletion({ action: "export-file", resolution: 3840, fps: 60 }),
    { action: "export-file", resolution: 3840, fps: 60 },
  );
});
test("each completed recording is accepted once even with interleaved redelivery", () => {
  const completed = new RecordingCompletions();
  assert.equal(completed.accept("first"), true);
  assert.equal(completed.accept("first"), false);
  assert.equal(completed.accept("second"), true);
  assert.equal(completed.accept("first"), false);
});
