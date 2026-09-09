import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readRecordingDestination,
  saveRecordingDestination,
} from "../../desktop/recording-destination.cts";

test("recording destination persists chosen folders and preserves settings on invalid choices", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "refract-destination-"));
  const settings = path.join(root, "recording-directory.json");
  const fallback = path.join(root, "original projects");
  const selected = path.join(root, "Recordings é");
  try {
    assert.equal(readRecordingDestination(settings, fallback), fallback);
    await fs.mkdir(selected);
    await saveRecordingDestination(settings, selected);
    assert.equal(readRecordingDestination(settings, fallback), selected);
    const saved = await fs.readFile(settings, "utf8");
    for (const invalid of [
      "relative-path",
      settings,
      path.join(root, "missing"),
    ]) {
      await assert.rejects(saveRecordingDestination(settings, invalid));
      assert.equal(await fs.readFile(settings, "utf8"), saved);
    }
    assert.deepEqual(
      (await fs.readdir(root)).sort(),
      ["Recordings é", "recording-directory.json"].sort(),
    );
    await fs.writeFile(settings, '{"directory":"relative"}');
    assert.equal(readRecordingDestination(settings, fallback), fallback);
    await fs.writeFile(settings, "broken json");
    assert.equal(readRecordingDestination(settings, fallback), fallback);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
